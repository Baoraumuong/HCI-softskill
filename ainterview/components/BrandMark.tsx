import { TrainFront } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white shadow-sm">
        <TrainFront size={18} strokeWidth={2.5} className="fill-gray-900" />
      </div>
      {!compact && (
        <span className="text-[14.5px] font-semibold tracking-tight text-gray-900">
          AInterview
        </span>
      )}
    </div>
  );
}
