import type { Member } from '../types';
import MemberAvatar from './MemberAvatar';

interface Props {
  members: Member[];
}

export default function Header({ members }: Props) {
  const sideMembers = members.slice(0, 5);

  return (
    <header className="relative mx-auto max-w-5xl px-3 pb-5 pt-4 sm:px-4 sm:pb-7 sm:pt-8">
      {sideMembers.length === 5 && (
        <div className="pointer-events-none fixed inset-y-0 left-0 right-0 z-10 hidden xl:block" aria-hidden="true">
          <div className="mx-auto h-full max-w-[92rem]">
            {sideMembers.map((member, index) => {
              const side = index % 2 === 0 ? 'left-10' : 'right-10';
              const verticalPosition = `${18 + Math.floor(index / 2) * 29}%`;

              return (
                <div
                  key={member.name}
                  className={`absolute ${side} flex -translate-y-1/2 items-center`}
                  style={{
                    top: verticalPosition,
                    animationDelay: `${index * 180}ms`,
                  }}
                >
                  <MemberAvatar member={member} className="h-24 w-24 rounded-full object-cover text-7xl drop-shadow-[0_5px_8px_rgba(126,34,206,0.25)]" />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-[1.5rem] border border-pink-200 bg-gradient-to-br from-white/90 via-pink-100/80 to-purple-100/90 px-4 py-6 text-center shadow-xl shadow-pink-200/50 sm:rounded-[2rem] sm:px-12 sm:py-8">
        <div className="pointer-events-none absolute left-0 top-0 h-28 w-28 -translate-x-8 -translate-y-8 rounded-full bg-pink-300/30 blur-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 translate-x-10 -translate-y-10 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="relative">
          <div className="mb-3 flex items-center justify-center gap-2 text-3xl sm:gap-3">
            <img src="/pics/mai.png" alt="" className="h-8 w-8 rotate-[-12deg] rounded-full object-cover shadow-sm sm:h-10 sm:w-10" />
            <span className="text-pink-400">✦</span>
            <img src="/pics/bngoc.png" alt="" className="h-8 w-8 rotate-[12deg] rounded-full object-cover shadow-sm sm:h-10 sm:w-10" />
          </div>
          <h1 className="text-[clamp(2rem,10vw,3.75rem)] font-black leading-[0.95] tracking-[-0.03em] text-pink-600">
            ĐIỂM DANH
            <span className="mt-1 block text-purple-600">MAI CONFESSION</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[28rem] text-xs font-bold uppercase tracking-[0.14em] text-purple-500 sm:text-sm sm:tracking-[0.18em]">
            địt mẹ chúng mày đi đủ cho bố
          </p>
          <p className="mt-2 text-sm text-purple-400">(chỉ tính từ 24/9)</p>
        </div>
      </div>
    </header>
  );
}
