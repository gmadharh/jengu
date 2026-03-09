import { AuthButton } from "@/components/AuthButton";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-sans relative overflow-hidden">
      {/* Extremely subtle "deep sea" ambient glow (5% Jengu creature vibe) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="flex w-full max-w-2xl flex-col items-center gap-8 p-12 bg-white/[0.03] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md relative z-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-light tracking-wide text-transparent bg-clip-text bg-gradient-to-br from-white to-teal-100/60">
            Jengu
          </h1>
          <p className="text-sm font-light text-zinc-400 max-w-sm">
            Voice Operated GitHub Agent. Authenticate to Begin.
          </p>
        </div>

        <div className="pt-4">
          <AuthButton />
        </div>
      </main>
    </div>
  );
}
