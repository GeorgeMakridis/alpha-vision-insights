import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODEL_LABELS, type ModelLabelKey } from "@/constants/modelLabels";

interface ModelBadgeProps {
  kind: ModelLabelKey;
  className?: string;
}

export default function ModelBadge({ kind, className }: ModelBadgeProps) {
  const config = MODEL_LABELS[kind];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant ?? "outline"}
            className={`text-[10px] font-normal cursor-help border-slate-600 text-slate-400 ${className ?? ""}`}
            aria-label={config.tooltip}
          >
            {config.badge}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
