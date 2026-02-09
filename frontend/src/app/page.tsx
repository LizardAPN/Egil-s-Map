import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent font-cinzel">
        Egil&apos;s Map
      </h1>
      <p className="text-gray-400 mb-8 text-center max-w-md font-special-elite">
        An open-source digital legacy platform where life journeys are visualized as a map of light.
      </p>
      <div className="flex gap-4">
        <Link
          href="/map"
          className="px-6 py-3 torn-paper-clip bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 transition font-cinzel"
        >
          Explore the Map
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 torn-paper-clip bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700 transition font-cinzel"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
