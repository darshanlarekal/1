import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const VALUE_CONFIG = {
  1:  { label: '+1%', emoji: '🚀', color: 'bg-green-500', light: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  0:  { label: '0%',  emoji: '😐', color: 'bg-gray-400',  light: 'bg-gray-100 dark:bg-gray-800',  text: 'text-gray-600 dark:text-gray-400' },
  '-1': { label: '-1%', emoji: '📉', color: 'bg-red-500', light: 'bg-red-100 dark:bg-red-900',   text: 'text-red-700 dark:text-red-300' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { updateUserStats } = useAuth();
  const [current, setCurrent] = useState(dayjs()); // month being displayed
  const [calendarData, setCalendarData] = useState({}); // { "YYYY-MM-DD": { value, note } }
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editValue, setEditValue] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMonth = useCallback(async (month) => {
    setLoading(true);
    try {
      const res = await api.get(`/entries/calendar/${month.year()}/${month.month() + 1}`);
      setCalendarData(res.data.calendar);
    } catch {
      toast.error('Failed to load calendar data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMonth(current); }, [current, fetchMonth]);

  const prevMonth = () => setCurrent((m) => m.subtract(1, 'month'));
  const nextMonth = () => setCurrent((m) => m.add(1, 'month'));

  // Build the calendar grid
  const startOfMonth = current.startOf('month');
  const daysInMonth = current.daysInMonth();
  const startDayOfWeek = startOfMonth.day(); // 0 = Sunday

  const today = dayjs().format('YYYY-MM-DD');
  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null); // empty leading cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const openEdit = (dateStr) => {
    if (!dateStr) return;
    const existing = calendarData[dateStr];
    setSelectedDate(dateStr);
    setEditValue(existing?.value ?? null);
    setEditNote(existing?.note || '');
  };

  const handleSave = async () => {
    if (editValue === null || !selectedDate) return;
    setSaving(true);
    try {
      const existing = calendarData[selectedDate];
      let res;
      if (existing) {
        res = await api.patch(`/entries/${selectedDate}`, { value: editValue, note: editNote });
      } else {
        res = await api.post('/entries', { value: editValue, note: editNote, date: selectedDate });
      }
      setCalendarData((prev) => ({
        ...prev,
        [selectedDate]: { value: editValue, note: editNote, id: res.data.entry._id },
      }));
      if (res.data.streak) updateUserStats(res.data.streak);
      toast.success('Entry saved!');
      setSelectedDate(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDate || !calendarData[selectedDate]) return;
    setSaving(true);
    try {
      const res = await api.delete(`/entries/${selectedDate}`);
      setCalendarData((prev) => {
        const next = { ...prev };
        delete next[selectedDate];
        return next;
      });
      if (res.data.streak) updateUserStats(res.data.streak);
      toast.success('Entry removed.');
      setSelectedDate(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Calendar</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="btn-ghost px-3 py-2 text-lg">←</button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {current.format('MMMM YYYY')}
        </h2>
        <button
          onClick={nextMonth}
          disabled={current.isSame(dayjs(), 'month')}
          className="btn-ghost px-3 py-2 text-lg disabled:opacity-30"
        >→</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const dateStr = current.date(day).format('YYYY-MM-DD');
            const entry = calendarData[dateStr];
            const isFuture = dayjs(dateStr).isAfter(dayjs(), 'day');
            const isToday = dateStr === today;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && openEdit(dateStr)}
                disabled={isFuture}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-xl
                  text-sm font-medium transition-all duration-150
                  ${isFuture ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
                  ${isSelected ? 'ring-2 ring-gray-900 dark:ring-white' : ''}
                  ${isToday && !entry ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                  ${entry
                    ? entry.value === 1
                      ? 'bg-green-500 text-white'
                      : entry.value === -1
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className="text-xs">{day}</span>
                {entry && (
                  <span className="text-xs leading-none">
                    {entry.value === 1 ? '+1' : entry.value === -1 ? '-1' : '0'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 justify-center">
        {Object.entries(VALUE_CONFIG).map(([v, cfg]) => (
          <div key={v} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cfg.color}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700" />
          <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
        </div>
      </div>

      {/* Edit panel */}
      {selectedDate && (
        <div className="mt-6 card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {dayjs(selectedDate).format('MMMM D, YYYY')}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1"
            >✕</button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(VALUE_CONFIG).map(([val, cfg]) => (
              <button
                key={val}
                onClick={() => setEditValue(Number(val))}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                  ${editValue === Number(val)
                    ? val === '1' ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : val === '-1' ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : 'border-gray-500 bg-gray-100 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <span className="text-xl">{cfg.emoji}</span>
                <span className={`text-sm font-bold font-mono ${editValue === Number(val) ? cfg.text : 'text-gray-500'}`}>
                  {cfg.label}
                </span>
              </button>
            ))}
          </div>

          <input
            type="text"
            className="input mb-3"
            placeholder="Optional note..."
            value={editNote}
            onChange={(e) => setEditNote(e.target.value.slice(0, 140))}
            maxLength={140}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={editValue === null || saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              Save
            </button>
            {calendarData[selectedDate] && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-sm font-medium transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
