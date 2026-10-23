export default function Header() {
  return (
    <header className="relative mx-auto max-w-5xl px-4 pt-8 pb-7">
      <div className="overflow-hidden rounded-[2rem] border border-pink-200 bg-gradient-to-br from-white/90 via-pink-100/80 to-purple-100/90 px-6 py-8 text-center shadow-xl shadow-pink-200/50 sm:px-12">
        <div className="pointer-events-none absolute left-0 top-0 h-28 w-28 -translate-x-8 -translate-y-8 rounded-full bg-pink-300/30 blur-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 translate-x-10 -translate-y-10 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="relative">
          <div className="mb-3 flex items-center justify-center gap-3 text-3xl">
            <span className="rotate-[-12deg]">🌸</span>
            <span className="text-pink-400">✦</span>
            <span className="rotate-[12deg]">🌸</span>
          </div>
          <h1 className="text-4xl font-black leading-none tracking-[-0.03em] text-pink-600 sm:text-6xl">
            ĐIỂM DANH
            <span className="mt-1 block text-purple-600">MAI CONFESSION</span>
          </h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-purple-500">
            địt mẹ chúng mày đi đủ cho bố
          </p>
          <p className="mt-2 text-sm text-purple-400">(chỉ tính từ 24/9)</p>
        </div>
      </div>
    </header>
  );
}
