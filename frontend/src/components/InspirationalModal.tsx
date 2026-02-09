"use client";

export function InspirationalModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="max-w-md p-8 torn-paper-clip text-center">
        <p className="text-xl text-amber-400 font-cinzel font-medium mb-4">{message}</p>
        <p className="text-gray-400 text-sm font-special-elite mb-6">
          You&apos;ve used your 5 daily inspirations. Come back tomorrow to inspire more.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 torn-paper-clip bg-amber-500 text-gray-900 font-cinzel font-medium hover:bg-amber-400"
        >
          Understood
        </button>
      </div>
    </div>
  );
}
