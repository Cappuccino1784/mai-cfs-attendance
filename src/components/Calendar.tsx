import { useState } from 'react';
import type { Hangout, Member } from '../types';
import MemberAvatar from './MemberAvatar';

interface Props {
  year: number;
  month: number;
  hangouts: Hangout[];
  members: Member[];
  onDayClick: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number) { return String(n).padStart(2, '0'); }

function getAttendanceCount(hangout: Hangout) {
  return hangout.attendance.filter(a => a.present === 1 || a.present === true).length;
}

export default function Calendar({ year, month, hangouts, members, onDayClick, onPrevMonth, onNextMonth }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const hangoutMap: Record<string, Hangout> = {};
  for (const h of hangouts) { hangoutMap[h.date] = h; }

  const totalMembers = members.length;

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Fill to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="mb-5 rounded-[1.5rem] border border-pink-200 bg-white/75 p-2.5 shadow-2xl shadow-pink-200/50 backdrop-blur-sm sm:mb-7 sm:rounded-[2rem] sm:p-7">
      {/* Month nav */}
      <div className="mb-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 px-2.5 py-2.5 shadow-lg shadow-purple-200/60 sm:mb-7 sm:rounded-2xl sm:px-4 sm:py-3">
        <button
          onClick={onPrevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white transition-colors hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-white/70 sm:h-10 sm:w-10"
        >
          ‹
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black tracking-[-0.02em] text-white sm:text-2xl">{MONTH_NAMES[month - 1]}</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-100">{year}</span>
        </div>
        <button
          onClick={onNextMonth}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white transition-colors hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 sm:mb-3">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-1 text-center text-[9px] font-black uppercase tracking-[0.04em] text-purple-400 sm:text-[11px] sm:tracking-[0.12em]">
            <span className="sm:hidden">{d.slice(0, 1)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-3">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = `${year}-${pad(month)}-${pad(day)}`;
          const hangout = hangoutMap[dateStr];
          const isToday = dateStr === todayStr;
          const count = hangout ? getAttendanceCount(hangout) : 0;
          const total = totalMembers;
          const isHovered = hoveredDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              onMouseEnter={() => setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`
                relative flex min-h-[76px] flex-col items-center overflow-hidden rounded-xl border border-pink-100 p-1.5 transition-all hover:scale-105 hover:shadow-lg sm:min-h-[132px] sm:rounded-2xl sm:p-2
                ${isToday
                  ? 'ring-2 ring-pink-300 bg-pink-50'
                  : hangout
                  ? 'bg-purple-50 hover:bg-purple-100'
                  : 'hover:bg-pink-50'
                }
              `}
              aria-label={`${dateStr}${hangout ? `, ${count} of ${total} attended` : ', no hangout recorded'}`}
              style={hangout?.photo_url ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${hangout.photo_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : undefined}
            >
              <span className={`
                text-base font-bold mb-1 z-10 sm:text-xl
                ${hangout?.photo_url ? 'text-white drop-shadow' : isToday ? 'text-pink-500' : 'text-gray-700'}
              `}>
                {day}
              </span>

              {hangout ? (
                <>
                  <span className={`
                    text-[9px] font-bold px-1 py-0.5 rounded-full z-10 sm:px-1.5 sm:text-[10px]
                    ${hangout?.photo_url ? 'bg-black/50 text-white' : 'bg-purple-100 text-purple-600'}
                  `}>
                    {count}/{total}
                  </span>
                  <span className="mt-1 flex max-w-full flex-wrap justify-center gap-0.5 text-lg leading-none z-10 sm:mt-2 sm:gap-1">
                    {members
                      .filter(member => hangout.attendance.some(record =>
                        record.person_name === member.name && (record.present === 1 || record.present === true)
                      ))
                      .map(member => (
                        <MemberAvatar key={member.name} member={member} className="h-5 w-5 drop-shadow-sm sm:h-7 sm:w-7" />
                      ))}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400 z-10">+</span>
              )}

              {hangout?.label && isHovered && (
                <span className="absolute inset-x-1 bottom-1 line-clamp-3 break-words rounded-xl bg-black/75 p-1.5 text-center text-[10px] text-white backdrop-blur-sm z-20">
                  {hangout.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
