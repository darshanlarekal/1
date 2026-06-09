import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import dayjs from 'dayjs';
import api from '../utils/api';
import toast from 'react-hot-toast';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, BarElement, Tooltip, Legend, Filler);

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
      <span className={`text-2xl font-bold font-mono ${color || 'text-gray-900 dark:text-white'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  );
}

// GitHub-style contribution heatmap
function Heatmap({ data }) {
  // Build last 365 days
  const today = dayjs();
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const d = today.subtract(i, 'day').format('YYYY-MM-DD');
    days.push(d);
  }

  const map = {};
  data.forEach((e) => { map[e.date] = e.value; });

  // Group into weeks (columns)
  const weeks = [];
  let week = [];
  // Pad start to Sunday
  const firstDay = dayjs(days[0]).day();
  for (let i = 0; i < firstDay; i++) week.push(null);
  days.forEach((d) => {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthLabels = [];
  weeks.forEach((w, wi) => {
    const first = w.find(Boolean);
    if (first && dayjs(first).date() <= 7) {
      monthLabels[wi] = dayjs(first).format('MMM');
    }
  });

  return (
    <div>
      {/* <div className="overflow-x-auto pb-2"> */}
      <div className="w-full pb-2">
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '18px' }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ height: '13px', width: '12px', fontSize: '9px', color: 'var(--tw-text-gray-400, #9ca3af)', lineHeight: '13px', textAlign: 'right' }}>
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          <div>
            {/* Month labels */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '2px', height: '16px' }}>
              {weeks.map((_, wi) => (
                <div key={wi} style={{ width: '13px', fontSize: '9px', color: 'var(--tw-text-gray-400, #9ca3af)', flexShrink: 0 }}>
                  {monthLabels[wi] || ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {week.map((date, di) => {
                    const val = date ? map[date] : null;
                    return (
                      <div
                        key={di}
                        title={date ? `${date}: ${val === 1 ? '+1%' : val === -1 ? '-1%' : val === 0 ? '0%' : 'no entry'}` : ''}
                        className="heatmap-cell"
                        style={{
                          background: !date ? 'transparent'
                            : val === 1 ? '#22c55e'
                            : val === -1 ? '#ef4444'
                            : val === 0 ? '#9ca3af'
                            : 'var(--heatmap-empty, #f3f4f6)',
                          opacity: !date ? 0 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-gray-400">Less</span>
        {[null, -1, 0, 1].map((v, i) => (
          <div key={i} className="heatmap-cell" style={{
            background: v === 1 ? '#22c55e' : v === -1 ? '#ef4444' : v === 0 ? '#9ca3af' : '#f3f4f6',
          }} />
        ))}
        <span className="text-xs text-gray-400">More</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then((res) => setData(res.data))
      .catch(() => toast.error('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.get('/entries/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plus-one-progress.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported!');
    } catch {
      toast.error('Export failed.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || data.totalEntries === 0) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">📊</div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No data yet</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm">Start logging daily entries to see your analytics.</p>
    </div>
  );

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#9ca3af' : '#6b7280';

  // additions
  // const compoundValues = [];
  let compound = 1;

  const compoundValues = data.lineData.map((d) => {
    if (d.value === 1) {
      compound *= 1.01;
    } else if (d.value === -1) {
      compound *= 0.99;
    }
    compound = parseFloat(compound.toFixed(4));

    return compound;
    // return Number(compound.toFixed(4));
  });
  // Line chart: cumulative score over time
  const lineData = {
    labels: data.lineData.map((d) => dayjs(d.date).format('MMM D')),
    datasets: [{
      label: 'Cumulative score',
      data: data.lineData.map((d) => d.cumulative),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderWidth: 2,
      pointRadius: data.lineData.length > 60 ? 0 : 3,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.4,
    }],
  };
  const compoundLineData = {
    labels: data.lineData.map((d) =>
      dayjs(d.date).format('MMM D')
    ),

    datasets: [
      {
        label: 'Compound growth %',

        data: compoundValues,

        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',

        borderWidth: 2,

        pointRadius:
          data.lineData.length > 60 ? 0 : 3,

        pointHoverRadius: 5,

        fill: true,
        tension: 0.4,
      },
    ],
  };
  const compoundLineOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.parsed.y.toFixed(4)}x`,
        },
      },
      // tooltip: {
      //   callbacks: {
      //     label: (context) =>
      //       `${context.parsed.y}%`,
      //   },
      // },
    },

    scales: {
      x: {
        ticks: {
          color: textColor,
          maxTicksLimit: 8,
          maxRotation: 0,
          font: { size: 11 },
        },

        grid: { color: gridColor },
      },

      y: {
        ticks: {
          color: textColor,
          // callback: (value) => `${value}x`,
          callback: (value) => `${Number(value).toFixed(2)}x`,
        },
        // ticks: {
        //   color: textColor,
        //   callback: (value) => `${value}%`,
        // },

        grid: { color: gridColor },
      },
    },
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: {
          color: textColor, maxTicksLimit: 8,
          maxRotation: 0, font: { size: 11 },
        },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
    },
  };

  // Bar chart: monthly summary
  const recentMonths = data.monthlyStats.slice(-6);
  const barData = {
    labels: recentMonths.map((m) => dayjs(m.month + '-01').format('MMM YY')),
    datasets: [
      {
        label: '+1% days',
        data: recentMonths.map((m) => m.positive),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      },
      {
        label: '0% days',
        data: recentMonths.map((m) => m.neutral),
        backgroundColor: '#9ca3af',
        borderRadius: 4,
      },
      {
        label: '-1% days',
        data: recentMonths.map((m) => m.negative),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: textColor, boxWidth: 12, font: { size: 11 } },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
      y: {
        stacked: true,
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
    },
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <button onClick={handleExport} className="btn-ghost text-sm flex items-center gap-1.5">
          <span>⬇</span> Export CSV
        </button>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total days" value={data.totalEntries} />
        <StatCard label="Current streak" value={`${data.currentStreak}🔥`} color="text-green-500" />
        <StatCard label="Longest streak" value={data.longestStreak} sub="days" />
        <StatCard label="Cumulative score" value={data.cumulativeScore > 0 ? `+${data.cumulativeScore}` : data.cumulativeScore} color={data.cumulativeScore >= 0 ? 'text-green-500' : 'text-red-500'} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Positive days" value={`${data.positivePercent}%`} sub={`${data.positiveCount} days`} color="text-green-500" />
        <StatCard label="Neutral days" value={`${(100 - data.positivePercent - data.negativePercent).toFixed(1)}%`} sub={`${data.neutralCount} days`} color="text-gray-500" />
        <StatCard label="Negative days" value={`${data.negativePercent}%`} sub={`${data.negativeCount} days`} color="text-red-500" />
      </div>

      {/* Cumulative line chart */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Cumulative progress over time
        </h2>
        <div style={{ height: 200 }}>
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>


      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Compound growth over time
        </h2>

      <div style={{ height: 200 }}>
        <Line
          data={compoundLineData}
          options={compoundLineOptions}
        />
      </div>
    </div>

      {/* Monthly bar chart */}
      {recentMonths.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Monthly breakdown (last 6 months)
          </h2>
          <div style={{ height: 200 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="card p-5 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Activity heatmap (last 365 days)
        </h2>
        <Heatmap data={data.heatmap} />
      </div>

      {/* Weekly averages table */}
      {data.weeklyAverages.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Recent weekly averages
          </h2>
          <div className="space-y-2">
            {data.weeklyAverages.slice(-8).reverse().map((w) => (
              <div key={w.week} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0 font-mono">
                  {dayjs(w.week).format('MMM D')}
                </span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      w.average > 0 ? 'bg-green-500' :
                      w.average < 0 ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                    style={{
                      width: `${Math.abs(w.average) * 100}%`,
                      marginLeft: w.average < 0 ? 'auto' : 0,
                    }}
                  />
                </div>
                <span className={`text-xs font-mono font-semibold w-10 text-right ${
                  w.average > 0 ? 'text-green-500' :
                  w.average < 0 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {w.average > 0 ? '+' : ''}{w.average}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
