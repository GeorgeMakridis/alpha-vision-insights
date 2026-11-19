"""Download the latest learned UC2 sentiment global model from an FL platform.

Uses only the platform's public HTTP API (no platform code needed):

* ``GET /tasks``                        list tasks, to find UC2 ones
* ``GET /tasks/{id}/model/info``        is a model available / finished?
* ``GET /tasks/{id}/model``             the model files as a zip

Without ``--task-id``, the newest UC2 task (by start/creation time) that has a
finished model is chosen; ``--allow-partial`` also accepts the latest round
checkpoint of a task that is still training.

    python download_model.py --api-url https://fl-backend.example.org --output models/
    python download_model.py --api-url http://localhost:8000 --task-id <id> --token "$TOKEN"

The model is extracted to ``<output>/<task_id>/`` together with a
``download.json`` describing what was downloaded.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

UC2_PACKAGE_ID = "uc2-sentiment"


class ApiError(RuntimeError):
    pass


class PlatformClient:
    def __init__(self, base_url: str, token: str | None = None, timeout: float = 120.0):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def _request(self, path: str, params: dict | None = None):
        url = self.base_url + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        request = urllib.request.Request(url, headers={"Accept": "application/json, application/zip"})
        if self.token:
            request.add_header("Authorization", f"Bearer {self.token}")
        try:
            return urllib.request.urlopen(request, timeout=self.timeout)
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read()).get("detail")
            except Exception:
                detail = exc.reason
            raise ApiError(f"{exc.code} from GET {path}: {detail}") from None
        except urllib.error.URLError as exc:
            raise ApiError(f"Cannot reach {url}: {exc.reason}") from None

    def get_json(self, path: str, params: dict | None = None):
        with self._request(path, params) as response:
            return json.loads(response.read())

    def list_tasks(self):
        return self.get_json("/tasks")

    def model_info(self, task_id: str):
        return self.get_json(f"/tasks/{urllib.parse.quote(task_id)}/model/info")

    def download_model(self, task_id: str, allow_partial: bool):
        params = {"allow_partial": "true"} if allow_partial else None
        with self._request(f"/tasks/{urllib.parse.quote(task_id)}/model", params) as response:
            headers = {k: v for k, v in response.headers.items() if k.lower().startswith("x-")}
            return response.read(), headers


def is_uc2(task: dict) -> bool:
    return task.get("package_id") == UC2_PACKAGE_ID or "uc2-sentiment" in str(task.get("flower_app_dir", ""))


def find_latest_task(client: PlatformClient, allow_partial: bool) -> tuple[dict, dict]:
    tasks = [t for t in client.list_tasks() if is_uc2(t)]
    if not tasks:
        raise ApiError("The platform has no UC2 sentiment tasks")
    tasks.sort(key=lambda t: t.get("started_at") or t.get("created_at") or "", reverse=True)
    skipped = []
    for task in tasks:
        info = client.model_info(task["id"])
        if info.get("available") and (info.get("complete") or allow_partial):
            return task, info
        reason = "no model yet" if not info.get("available") else f"unfinished (round {info.get('round')})"
        skipped.append(f"  {task['id']} '{task.get('name', '')}': {reason}")
    hint = "" if allow_partial else "\nUse --allow-partial to accept an unfinished model."
    raise ApiError("No UC2 task has a downloadable model:\n" + "\n".join(skipped) + hint)


def extract(archive: bytes, destination: Path) -> list[str]:
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        for member in zf.namelist():
            target = (destination / member).resolve()
            if destination.resolve() not in target.parents:
                raise ApiError(f"Refusing unsafe path in archive: {member}")
        zf.extractall(destination)
        return sorted(zf.namelist())


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-url", default=os.environ.get("FL_PLATFORM_API_URL", "http://localhost:8000"),
                        help="Platform backend URL (env FL_PLATFORM_API_URL)")
    parser.add_argument("--token", default=os.environ.get("FL_PLATFORM_MODEL_API_TOKEN"),
                        help="Bearer token if the platform requires one (env FL_PLATFORM_MODEL_API_TOKEN)")
    parser.add_argument("--task-id", help="Download this task instead of the newest UC2 task")
    parser.add_argument("--allow-partial", action="store_true",
                        help="Accept the latest round checkpoint if training has not finished")
    parser.add_argument("--output", type=Path, default=Path("models"), help="Directory to store models in")
    args = parser.parse_args()

    client = PlatformClient(args.api_url, args.token)
    try:
        if args.task_id:
            task = {"id": args.task_id}
            info = client.model_info(args.task_id)
            if not info.get("available"):
                raise ApiError(f"Task {args.task_id} has no saved model yet (status: {info.get('task_status')})")
        else:
            task, info = find_latest_task(client, args.allow_partial)
        print(f"Task {task['id']} {task.get('name', '')!r}: {info.get('kind')} model, round "
              f"{info.get('round')}/{info.get('num_rounds')}, complete={info.get('complete')}")
        archive, headers = client.download_model(task["id"], args.allow_partial)
    except ApiError as exc:
        sys.exit(f"error: {exc}")

    destination = args.output / task["id"]
    files = extract(archive, destination)
    metadata = {
        "api_url": args.api_url,
        "task_id": task["id"],
        "task_name": task.get("name"),
        "package_id": info.get("package_id"),
        "package_version": info.get("package_version"),
        "kind": headers.get("X-Model-Kind", info.get("kind")),
        "complete": headers.get("X-Model-Complete", str(info.get("complete")).lower()) == "true",
        "round": int(headers["X-Model-Round"]) if "X-Model-Round" in headers else info.get("round"),
        "num_rounds": info.get("num_rounds"),
        "flower_run_id": headers.get("X-Flower-Run-Id", info.get("run_id")),
        "files": files,
    }
    (destination / "download.json").write_text(json.dumps(metadata, indent=2))
    print(f"Saved {len(files)} files ({len(archive) / 1e6:.1f} MB zipped) to {destination}")


if __name__ == "__main__":
    main()
