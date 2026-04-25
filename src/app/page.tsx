import GradientGallery from "./components/GradientGallery";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-8 text-zinc-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-rose-500 via-amber-400 via-emerald-500 via-sky-500 to-violet-600 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
              渐变配色库
            </h1>
          </div>
          <p className="text-sm font-medium text-zinc-500">
            CSS background collection
          </p>
        </header>

        <GradientGallery />
      </div>
    </main>
  );
}
