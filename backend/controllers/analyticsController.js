const dayjs = require('dayjs');
const DailyEntry = require('../models/DailyEntry');
const User = require('../models/User');

// ─── GET /api/analytics/dashboard ────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Fetch all entries sorted oldest → newest
    const entries = await DailyEntry.find({ user: userId })
      .sort({ date: 1 })
      .lean();

    if (!entries.length) {
      return res.json({
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        positivePercent: 0,
        negativePercent: 0,
        cumulativeScore: 0,
        weeklyAverages: [],
        monthlyStats: [],
        recentEntries: [],
        heatmap: [],
      });
    }

    // ── Counts ───────────────────────────────────────────────────────────────
    const positiveCount = entries.filter((e) => e.value === 1).length;
    const neutralCount = entries.filter((e) => e.value === 0).length;
    const negativeCount = entries.filter((e) => e.value === -1).length;
    const total = entries.length;
    const cumulativeScore = entries.reduce((sum, e) => sum + e.value, 0);

    // ── Cumulative line data (for chart) ──────────────────────────────────────
    let running = 0;
    const lineData = entries.map((e) => {
      running += e.value;
      return { date: e.date, value: e.value, cumulative: running };
    });

    // ── Weekly averages ───────────────────────────────────────────────────────
    const weekMap = {};
    entries.forEach((e) => {
      const weekStart = dayjs(e.date).startOf('week').format('YYYY-MM-DD');
      if (!weekMap[weekStart]) weekMap[weekStart] = [];
      weekMap[weekStart].push(e.value);
    });

    const weeklyAverages = Object.entries(weekMap).map(([week, vals]) => ({
      week,
      average: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)),
      count: vals.length,
    }));

    // ── Monthly stats ─────────────────────────────────────────────────────────
    const monthMap = {};
    entries.forEach((e) => {
      const month = e.date.slice(0, 7); // YYYY-MM
      if (!monthMap[month]) monthMap[month] = { pos: 0, neg: 0, neu: 0, total: 0, sum: 0 };
      monthMap[month].total++;
      monthMap[month].sum += e.value;
      if (e.value === 1) monthMap[month].pos++;
      else if (e.value === -1) monthMap[month].neg++;
      else monthMap[month].neu++;
    });

    const monthlyStats = Object.entries(monthMap).map(([month, s]) => ({
      month,
      positive: s.pos,
      negative: s.neg,
      neutral: s.neu,
      total: s.total,
      sum: s.sum,
      average: parseFloat((s.sum / s.total).toFixed(2)),
    }));

    // ── Heatmap (last 365 days) ───────────────────────────────────────────────
    const yearAgo = dayjs().subtract(365, 'day').format('YYYY-MM-DD');
    const heatmap = entries
      .filter((e) => e.date >= yearAgo)
      .map((e) => ({ date: e.date, value: e.value }));

    res.json({
      totalEntries: total,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      positiveCount,
      neutralCount,
      negativeCount,
      positivePercent: parseFloat(((positiveCount / total) * 100).toFixed(1)),
      negativePercent: parseFloat(((negativeCount / total) * 100).toFixed(1)),
      cumulativeScore,
      lineData,
      weeklyAverages,
      monthlyStats,
      heatmap,
      recentEntries: entries.slice(-7).reverse(),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error fetching analytics.' });
  }
};
