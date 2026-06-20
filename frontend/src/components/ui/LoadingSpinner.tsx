import { Loader2 } from "lucide-react";

export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin mb-3 text-lick-orange" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message = "Failed to load data",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-lg font-medium text-red-400 mb-2">Something went wrong</p>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-lick-orange text-black text-sm font-medium hover:bg-lick-orange-light transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
