import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ACK_STORAGE_KEY, PRODUCT_NAME } from "@/constants/legal";

export default function DisclaimerAckModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const acked = localStorage.getItem(ACK_STORAGE_KEY);
      if (!acked) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleAck = () => {
    try {
      localStorage.setItem(ACK_STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Important notice</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300 space-y-3 text-left">
            <p>
              <strong>{PRODUCT_NAME}</strong> is an open-source research tool for
              S&amp;P 100 risk analytics. It does <strong>not</strong> provide
              investment, legal, or tax advice.
            </p>
            <p>
              We are <strong>not</strong> a regulated financial services firm. Outputs
              include <strong>AI-generated and model-based estimates</strong> that may
              be wrong, outdated, or incomplete.
            </p>
            <p className="text-sm">
              See our{" "}
              <Link to="/disclaimer" className="text-dashboard-accent underline">
                Disclaimer
              </Link>{" "}
              and{" "}
              <Link to="/terms" className="text-dashboard-accent underline">
                Terms of Use
              </Link>
              .
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleAck}
            className="bg-dashboard-accent hover:bg-dashboard-highlight"
          >
            I understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
