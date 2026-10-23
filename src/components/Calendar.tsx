import type { Hangout } from '../types';

interface Props {
  year: number;
  month: number;
  hangouts: Hangout[];
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
  return hangout.attendance.filter(a => a.present === 1).length;
}

function getCountColor(count: number, total: number) {
  const ratio = count / total;
  if (ratio === 0) return 'bg-gray-100 text-gray-400';
  if (ratio <= 0.4) return 'bg-rose-100 text-rose-400';
  if (ratio <= 0.6) return 'bg-yellow-100 text-yellow-500';
  if (ratio < 1) return 'bg-purple-100 text-purple-500';
  return 'bg-green-100 text-green-600';
}

export default function Calendar({ year, month, hangouts, onDayClick, onPrevMonth, onNextMonth }: Props) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const hangoutMap: Record<string, Hangout> = {};
  for (const h of hangouts) { hangoutMap[h.date] = h; }

  const totalMembers = Math.max(
    ...hangouts.map(h => h.attendance.length),
    5
  );

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Fill to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg shadow-pink-100 p-6 mb-6 border border-pink-100">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onPrevMonth}
          className="w-10 h-10 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-500 transition-colors flex items-center justify-center text-lg font-bold"
        >
          ‹
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-purple-500">{MONTH_NAMES[month - 1]}</h2>
          <span className="text-xs text-purple-300">{year}</span>
        </div>
        <button
          onClick={onNextMonth}
          className="w-10 h-10 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-500 transition-colors flex items-center justify-center text-lg font-bold"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-purple-300 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = `${year}-${pad(month)}-${pad(day)}`;
          const hangout = hangoutMap[dateStr];
          const isToday = dateStr === todayStr;
          const count = hangout ? getAttendanceCount(hangout) : 0;
          const total = hangout ? Math.max(hangout.attendance.length, totalMembers) : totalMembers;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`
                relative rounded-2xl p-1 flex flex-col items-center min-h-[60px] transition-all
                hover:scale-105 hover:shadow-md
                ${isToday
                  ? 'ring-2 ring-pink-300 bg-pink-50'
                  : hangout
                  ? 'bg-purple-50 hover:bg-purple-100'
                  : 'hover:bg-pink-50'
                }
              `}
            >
              <span className={`
                text-sm font-medium mb-1
                ${isToday ? 'text-pink-500 font-bold' : 'text-gray-600'}
              `}>
                {day}
              </span>

              {hangout ? (
                <>
                  <span className={`
                    text-[10px] font-bold px-1.5 py-0.5 rounded-full
                    ${getCountColor(count, total)}
                  `}>
                    {count}/{total}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-gray-300">+</span>
              )}

              {hangout?.label && (
                <span className="text-[9px] text-purple-400 mt-0.5 truncate w-full text-center leading-tight">
                  {hangout.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {[
          { label: 'None', cls: 'bg-rose-100 text-rose-400' },
          { label: 'Some', cls: 'bg-yellow-100 text-yellow-500' },
          { label: 'Most', cls: 'bg-purple-100 text-purple-500' },
          { label: 'All!', cls: 'bg-green-100 text-green-600' },
        ].map(l => (
          <span key={l.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
