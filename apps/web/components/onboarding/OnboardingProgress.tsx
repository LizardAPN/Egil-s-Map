const STEP_LABELS = ["Имя", "Глава", "Пин"] as const;

export function OnboardingProgress({ step }: { step: 1 | 2 | 3 }) {
  const label = STEP_LABELS[step - 1];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= step;

          return (
            <span
              key={stepNumber}
              className={
                isActive
                  ? "h-2 w-2 rounded-full bg-amber"
                  : "h-2 w-2 rounded-full bg-night-600"
              }
            />
          );
        })}
      </div>
      <p className="text-[11px] tracking-[0.12em] text-ink-secondary uppercase">
        {label}
      </p>
    </div>
  );
}
