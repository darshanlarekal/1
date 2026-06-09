import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const VALUE_CONFIG = {
  1:  { label: '+1%',   emoji: '🚀', desc: 'Better than yesterday',  cls: 'value-btn-positive' },
  0:  { label: '0%',    emoji: '😐', desc: 'Same as yesterday',       cls: 'value-btn-neutral' },
  '-1': { label: '-1%', emoji: '📉', desc: 'Worse than yesterday',    cls: 'value-btn-negative' },
};

const MOTIVATIONAL = {
  1: [
    'Momentum compounds.',
    'Tiny gains become massive.',
    'One more vote for your future self.',
    'You moved the graph upward.',
    'Another brick added.',
    'The curve bends slowly.',
    'Progress likes patience.',
    'You kept the promise today.',
    'One disciplined day.',
    'The system worked today.',
    'A small win is still a win.',
    'Future you benefits from this.',
    'You are becoming reliable.',
    'Consistency is a superpower.',
    'Another +1 in the bank.',
    'This is how compounding feels.',
    'You showed up again.',
    'Discipline beat mood today.',
    'The streak continues.',
    'Incremental growth is real.',
    'Tiny edges stack up.',
    'One step forward.',
    'Good trajectories matter.',
    'Today mattered.',
    'Better, not perfect.',
    'Small changes rewrite years.',
    'You nudged life upward.',
    'That decision counts.',
    'Identity follows repetition.',
    'Growth happened quietly today.',
    'You improved the average.',
    'Your future is built daily.',
    'You stayed intentional.',
    'Another clean rep.',
    'This is what self-respect looks like.',
    'One more day aligned.',
    'You strengthened the habit.',
    'Tiny progress. Real progress.',
    'Slow progress still compounds.',
    'You kept moving.',
  ],

  0: [
    'Flat days happen.',
    'Neutral is temporary.',
    'No growth today. No shame either.',
    'Maintenance still matters.',
    'You paused, not quit.',
    'Still aware. Still tracking.',
    'Rest can be strategic.',
    'Some days stabilize the system.',
    'Consistency includes quiet days.',
    'Not every day spikes upward.',
    'Reflection is progress too.',
    'The graph breathes.',
    'You stayed conscious today.',
    'Stability has value.',
    'The journey includes plateaus.',
    'No collapse. No leap. Just today.',
    'Awareness beats autopilot.',
    'A neutral day is still data.',
    'The baseline matters.',
    'Tomorrow can shift the curve.',
    'Progress is rarely dramatic.',
    'You didn’t disappear.',
    'Still in the game.',
    'A calm day counts too.',
    'Recovery matters.',
    'The system stayed alive.',
    'Not every page needs a breakthrough.',
    'Today held steady.',
    'Still tracking. Still trying.',
    'No momentum gained. None lost.',
    'Consistency survives average days.',
    'Quiet days shape resilience.',
    'No chaos today.',
    'Stagnation noticed is stagnation challenged.',
    'Balance can be useful.',
    'Even stillness teaches.',
    'The line flattened, not ended.',
    'No reset required.',
    'Tomorrow remains open.',
    'Neutral is not failure.',
  ],

  '-1': [
    'Awareness is part of growth.',
    'Bad days tracked are lessons saved.',
    'Growth is not linear.',
    'You noticed it. That matters.',
    'A setback is still information.',
    'Honesty beats denial.',
    'Even decline teaches.',
    'Own it. Reset tomorrow.',
    'You faced the data.',
    'Tomorrow starts fresh.',
    'Progress includes friction.',
    'This day does not define you.',
    'The graph dips sometimes.',
    'You stayed honest.',
    'Recovery begins with awareness.',
    'Failure tracked becomes feedback.',
    'Every system has volatility.',
    'One rough day ≠ a rough life.',
    'You logged reality.',
    'The comeback starts small.',
    'Not every investment goes green.',
    'Reflection matters more than ego.',
    'A dip is not the end.',
    'You caught it early.',
    'Self-awareness is rare.',
    'Bad patterns weaken when noticed.',
    'The streak broke. The journey didn’t.',
    'You are still building.',
    'Even regression teaches direction.',
    'This is part of the curve.',
    'A hard day recorded is a hard day processed.',
    'You stayed accountable.',
    'Tomorrow is unwritten.',
    'The system bends. It doesn’t shatter.',
    'You confronted the truth.',
    'Data over denial.',
    'One bad day cannot erase progress.',
    'You can recover faster now.',
    'Reflection creates leverage.',
    'Every downturn contains information.',
  ],
};

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function DashboardPage() {
  const { user, updateUserStats } = useAuth();
  const today = dayjs().format('YYYY-MM-DD');

  const [todayEntry, setTodayEntry] = useState(null);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [motivation, setMotivation] = useState('');

  // Load today's existing entry
  useEffect(() => {
    api.get('/entries', { params: { from: today, to: today } })
      .then((res) => {
        const entry = res.data.entries?.[0];
        if (entry) {
          setTodayEntry(entry);
          setSelected(entry.value);
          setNote(entry.note || '');
          setSubmitted(true);
          setMotivation(rand(MOTIVATIONAL[entry.value]));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [today]);

  const handleSubmit = async () => {
    if (selected === null) return;
    setSaving(true);
    try {
      let res;
      if (todayEntry) {
        res = await api.patch(`/entries/${today}`, { value: selected, note });
        toast.success('Entry updated!');
      } else {
        res = await api.post('/entries', { value: selected, note, date: today });
        toast.success('Logged! Keep going 💪');
      }
      setTodayEntry(res.data.entry);
      setSubmitted(true);
      setMotivation(rand(MOTIVATIONAL[selected]));
      if (res.data.streak) updateUserStats(res.data.streak);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setSubmitted(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">
          {dayjs().format('dddd, MMMM D')}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {submitted ? 'Today\'s entry' : 'How was today?'}
        </h1>
      </div>

      {/* Streak banner */}
      {user?.currentStreak > 0 && (
        <div className={`
          mb-6 flex items-center gap-3 p-4 rounded-2xl
          bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900
          ${user.currentStreak >= 7 ? 'animate-streak-pulse' : ''}
        `}>
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">
              {user.currentStreak} day streak!
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              {user.currentStreak >= 30
                ? 'Incredible consistency. You\'re unstoppable.'
                : user.currentStreak >= 7
                ? 'A full week! You\'re building a real habit.'
                : 'Keep logging daily to build your streak.'}
            </p>
          </div>
        </div>
      )}

      {/* Submitted state */}
      {submitted ? (
        <div className="animate-bounce-in">
          <div className={`
            card p-8 text-center mb-4
            ${selected === 1 ? 'border-green-200 dark:border-green-800' :
              selected === -1 ? 'border-red-200 dark:border-red-900' :
              'border-gray-200 dark:border-gray-700'}
          `}>
            <div className="text-5xl mb-3">{VALUE_CONFIG[selected]?.emoji}</div>
            <div className={`text-4xl font-black mb-2 font-mono
              ${selected === 1 ? 'text-green-500' :
                selected === -1 ? 'text-red-500' : 'text-gray-400'}
            `}>
              {VALUE_CONFIG[selected]?.label}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {motivation}
            </p>
            {note && (
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 italic">
                "{note}"
              </p>
            )}
          </div>

          <button onClick={handleEdit} className="btn-ghost w-full text-sm">
            ✏️ Edit today's entry
          </button>
        </div>
      ) : (
        /* Selection state */
        <div className="space-y-4 animate-fade-in">
          {/* 3 buttons */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(VALUE_CONFIG).map(([val, cfg]) => (
              <button
                key={val}
                className={cfg.cls}
                data-selected={selected === Number(val)}
                onClick={() => setSelected(Number(val))}
              >
                <span className="text-3xl">{cfg.emoji}</span>
                <span className="font-black text-xl font-mono">{cfg.label}</span>
                <span className="text-xs font-normal opacity-75 text-center leading-tight hidden sm:block">
                  {cfg.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Optional note */}
          {selected !== null && (
            <div className="animate-fade-in">
              <input
                type="text"
                className="input"
                placeholder="Optional: one word or phrase for today... (140 chars)"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                maxLength={140}
              />
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={selected === null || saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? 'Saving...' : todayEntry ? 'Update entry' : 'Log today'}
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mt-8">
        <div className="stat-card">
          <span className="text-xs text-gray-400 dark:text-gray-500">Total days</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
            {user?.totalEntries ?? 0}
          </span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-gray-400 dark:text-gray-500">Best streak</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
            {user?.longestStreak ?? 0}
          </span>
        </div>
        <div className="stat-card">
          <span className="text-xs text-gray-400 dark:text-gray-500">Current</span>
          <span className="text-2xl font-bold text-green-500 font-mono">
            {user?.currentStreak ?? 0}🔥
          </span>
        </div>
      </div>
    </div>
  );
}
