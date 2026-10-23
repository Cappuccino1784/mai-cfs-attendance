import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { StatsResponse } from '../types';

interface Props { stats: StatsResponse; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-pink-100 px-4 py-3 text-sm">
        <p className="font-bold text-purple-600">{d.emoji} {label}</p>
        <p className="text-pink-500 mt-1">
          {d.attended} / {d.total} hangouts
        </p>
        <p className="text-gray-400 text-xs">
          {d.total > 0 ? Math.round((d.attended / d.total) * 100) : 0}% attendance
        </p>
      </div>
    );
  }
  return null;
};

export default function StatsChart({ stats }: Props) {
  const { members, totalHangouts } = stats;

  const data = members.map(m => ({
    name: m.name.split(' ').pop()!, // Use last name for brevity
    fullName: m.name,
    attended: m.attended,
    total: totalHangouts,
    color: m.color,
    emoji: m.emoji,
  }));

  if (totalHangouts === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg shadow-pink-100 p-8 border border-pink-100 text-center">
        <div className="text-4xl mb-3">🌷</div>
        <p className="text-purple-400 font-medium">No hangouts recorded yet!</p>
        <p className="text-pink-300 text-sm mt-1">Click any day on the calendar to start ✨</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg shadow-pink-100 p-6 border border-pink-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-purple-600 text-lg">Attendance Stats 🎀</h3>
          <p className="text-purple-300 text-xs mt-0.5">{totalHangouts} total hangout{totalHangouts !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Member pills summary */}
      <div className="flex flex-wrap gap-2 mb-5">
        {members.map(m => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
            style={{ backgroundColor: m.color + '33', border: `1.5px solid ${m.color}88` }}
          >
            <span>{m.emoji}</span>
            <span className="text-gray-600">{m.name.split(' ').pop()}</span>
            <span
              className="ml-1 font-bold"
              style={{ color: m.color }}
            >
              {m.attended}/{totalHangouts}
            </span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0e8f5" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#a78bfa' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#c4b5fd' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, totalHangouts]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(216, 180, 254, 0.15)' }} />
          <Bar dataKey="attended" radius={[8, 8, 0, 0]} maxBarSize={52}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* "Perfect attendance" badge */}
      {members.filter(m => m.attended === totalHangouts && totalHangouts > 0).map(m => (
        <div
          key={m.id}
          className="mt-2 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-yellow-600 font-medium"
        >
          <span>⭐</span>
          <span>{m.name} has perfect attendance!</span>
        </div>
      ))}
    </div>
  );
}
