import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { Member, Hangout, StatsResponse } from './types';
import Calendar from './components/Calendar';
import AttendanceModal from './components/AttendanceModal';
import Header from './components/Header';

const StatsChart = lazy(() => import('./components/StatsChart'));

export default function App() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [members, setMembers] = useState<Member[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHangout, setSelectedHangout] = useState<Hangout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, h, s] = await Promise.all([
        api.getMembers(),
        api.getHangouts(currentYear, currentMonth),
        api.getStats(),
      ]);
      setMembers(m);
      setHangouts(h);
      setStats(s);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Unable to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDayClick = (date: string) => {
    const existing = hangouts.find(h => h.date === date);
    setSelectedDate(date);
    setSelectedHangout(existing ?? null);
  };

  const handleModalClose = () => {
    setSelectedDate(null);
    setSelectedHangout(null);
  };

  const handleSave = async (
    date: string,
    attendance: { person_name: string; present: boolean }[],
    label?: string,
    photo?: File | null
  ) => {
    try {
      if (selectedHangout) {
        await api.updateHangout(selectedHangout.id, { label, attendance, photo });
      } else {
        await api.createHangout({ date, label, attendance, photo });
      }
      await fetchAll();
      handleModalClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to save attendance';
      setError(message);
      throw e;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteHangout(id);
      await fetchAll();
      handleModalClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete hangout');
      throw e;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-peach-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-4xl animate-bounce">🌸</div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <Calendar
              year={currentYear}
              month={currentMonth}
              hangouts={hangouts}
              members={members}
              onDayClick={handleDayClick}
              onPrevMonth={() => {
                if (currentMonth === 1) {
                  setCurrentMonth(12); setCurrentYear(y => y - 1);
                } else { setCurrentMonth(m => m - 1); }
              }}
              onNextMonth={() => {
                if (currentMonth === 12) {
                  setCurrentMonth(1); setCurrentYear(y => y + 1);
                } else { setCurrentMonth(m => m + 1); }
              }}
            />
            {stats && (
              <Suspense fallback={<div className="mt-7 h-64 animate-pulse rounded-[2rem] bg-white/60" aria-label="Loading attendance stats" />}>
                <StatsChart stats={stats} />
              </Suspense>
            )}
          </>
        )}
      </main>

      {selectedDate && (
        <AttendanceModal
          date={selectedDate}
          hangout={selectedHangout}
          members={members}
          error={error}
          onClose={handleModalClose}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
