import { Skeleton } from "@imprint/ui";

export function TimelineSkeleton() {
  return (
    <div className="space-y-2 px-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex gap-3 py-2">
          <div className="relative flex w-4 shrink-0 justify-center pt-1">
            <span
              className="absolute top-0 bottom-0 w-0.5 bg-night-600"
              aria-hidden
            />
            <Skeleton className="relative z-[1] size-2 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
