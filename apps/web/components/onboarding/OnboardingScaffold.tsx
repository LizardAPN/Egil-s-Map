"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface OnboardingScaffoldProps {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  ctaDisabled?: boolean;
  ctaBusy?: boolean;
  inlineError?: string | null;
  visual?: ReactNode;
}

export function OnboardingScaffold({
  title,
  body,
  ctaHref,
  ctaLabel,
  onCtaClick,
  ctaDisabled = false,
  ctaBusy = false,
  inlineError = null,
  visual
}: OnboardingScaffoldProps) {
  const cta =
    onCtaClick != null ? (
      <button
        type="button"
        className="imprint-primary"
        disabled={ctaDisabled || ctaBusy}
        onClick={onCtaClick}
      >
        {ctaBusy ? "Saving…" : ctaLabel}
      </button>
    ) : (
      <Link className="imprint-primary" href={ctaHref ?? "/"}>
        {ctaLabel}
      </Link>
    );

  return (
    <main className="imprint-shell imprint-onboarding-shell">
      <section className="imprint-onboarding">
        {visual ? <div className="imprint-onboarding-visual-wrap">{visual}</div> : null}
        <div className="imprint-copy imprint-onboarding-copy">
          <h1>{title}</h1>
          <p className="imprint-subcopy">{body}</p>
          <div className="imprint-actions imprint-onboarding-actions">{cta}</div>
          {inlineError ? (
            <p className="app-error" role="alert">
              {inlineError}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
