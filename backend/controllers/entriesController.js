const { validationResult } = require('express-validator');
const dayjs = require('dayjs');
const DailyEntry = require('../models/DailyEntry');
const User = require('../models/User');

// // ─── Helper: recalculate and persist streak for a user ────────────────────────
async function recalculateStreak(userId) {
  const entries = await DailyEntry.find({ user: userId })
    .sort({ date: 1 }) // oldest → newest
    .select('date value')
    .lean();

  if (!entries.length) {
    await User.findByIdAndUpdate(userId, {
      currentStreak: 0,
      longestStreak: 0,
      totalEntries: 0,
    });
    return { currentStreak: 0, longestStreak: 0, totalEntries: 0 };
  }

  // ── CURRENT STREAK ──────────────────────────
  let currentStreak = 0;
  
  // NEW: Check if they logged anything today or yesterday
  const today = dayjs().startOf('day');
  const latestEntryDate = dayjs(entries[entries.length - 1].date).startOf('day');
  const daysSinceLast = today.diff(latestEntryDate, 'day');

  // Only calculate active streak if the last entry was recent
  if (daysSinceLast <= 1) {
    for (let i = entries.length - 1; i >= 0; i--) {
      const current = entries[i];

      // streak only counts +1
      if (current.value !== 1) break;

      // check consecutive days
      if (i < entries.length - 1) {
        const next = entries[i + 1];
        const diff = dayjs(next.date).diff(dayjs(current.date), 'day');
        if (diff !== 1) break;
      }
      currentStreak++;
    }
  }

  // ── LONGEST STREAK ──────────────────────────
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];

    // only +1 counts
    if (current.value !== 1) {
      tempStreak = 0;
      continue;
    }

    if (i > 0) {
      const prev = entries[i - 1];
      const diff = dayjs(current.date).diff(dayjs(prev.date), 'day');

      if (prev.value === 1 && diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Save the CORRECT calculations to the database
  await User.findByIdAndUpdate(userId, {
    currentStreak,
    longestStreak,
    totalEntries: entries.length,
  });

  return {
    currentStreak,
    longestStreak,
    totalEntries: entries.length,
  };
}



// async function recalculateStreak(userId) {
//   const entries = await DailyEntry.find({ user: userId })
//     .sort({ date: 1 }) // oldest → newest
//     .select('date value')
//     .lean();

//   if (!entries.length) {
//     await User.findByIdAndUpdate(userId, {
//       currentStreak: 0,
//       longestStreak: 0,
//       totalEntries: 0,
//     });

//     return {
//       currentStreak: 0,
//       longestStreak: 0,
//       totalEntries: 0,
//     };
//   }

//   // ── CURRENT STREAK ──────────────────────────
//   let currentStreak = 0;

//   for (let i = entries.length - 1; i >= 0; i--) {
//     const current = entries[i];

//     // streak only counts +1
//     if (current.value !== 1) break;

//     // check consecutive days
//     if (i < entries.length - 1) {
//       const next = entries[i + 1];

//       const diff = dayjs(next.date).diff(dayjs(current.date), 'day');

//       if (diff !== 1) break;
//     }

//     currentStreak++;
//   }

//   // ── LONGEST STREAK ──────────────────────────
//   let longestStreak = 0;
//   let tempStreak = 0;

//   for (let i = 0; i < entries.length; i++) {
//     const current = entries[i];

//     // only +1 counts
//     if (current.value !== 1) {
//       tempStreak = 0;
//       continue;
//     }

//     if (i > 0) {
//       const prev = entries[i - 1];

//       const diff = dayjs(current.date).diff(dayjs(prev.date), 'day');

//       if (prev.value === 1 && diff === 1) {
//         tempStreak++;
//       } else {
//         tempStreak = 1;
//       }
//     } else {
//       tempStreak = 1;
//     }

//     longestStreak = Math.max(longestStreak, tempStreak);
//   }

//   await User.findByIdAndUpdate(userId, {
//     currentStreak,
//     longestStreak,
//     totalEntries: entries.length,
//   });

//   return {
//     currentStreak,
//     longestStreak,
//     totalEntries: entries.length,
//   };
// }

// ─── POST /api/entries ────────────────────────────────────────────────────────
exports.addEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { value, note, date } = req.body;
    const userId = req.user._id;

    // Use provided date or today
    const entryDate = date || dayjs().format('YYYY-MM-DD');

    // Prevent future dates
    if (dayjs(entryDate).isAfter(dayjs(), 'day')) {
      return res.status(400).json({ error: 'Cannot log entries for future dates.' });
    }

    // Check for existing entry on this date (enforced by DB unique index too)
    const existing = await DailyEntry.findOne({ user: userId, date: entryDate });
    if (existing) {
      return res.status(409).json({
        error: 'You already have an entry for this date. Use PATCH to edit it.',
        existingId: existing._id,
      });
    }

    const entry = await DailyEntry.create({
      user: userId,
      date: entryDate,
      value,
      note: note || '',
    });

    const streakData = await recalculateStreak(userId);

    res.status(201).json({
      message: 'Entry saved!',
      entry,
      streak: streakData,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Entry already exists for this date.' });
    }
    console.error('Add entry error:', err);
    res.status(500).json({ error: 'Server error saving entry.' });
  }
};

// ─── PATCH /api/entries/:date ─────────────────────────────────────────────────
exports.editEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date } = req.params;
    const { value, note } = req.body;
    const userId = req.user._id;

    const entry = await DailyEntry.findOneAndUpdate(
      { user: userId, date },
      { value, note: note !== undefined ? note : '' },
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({ error: 'No entry found for this date.' });
    }

    const streakData = await recalculateStreak(userId);

    res.json({ message: 'Entry updated!', entry, streak: streakData });
  } catch (err) {
    console.error('Edit entry error:', err);
    res.status(500).json({ error: 'Server error updating entry.' });
  }
};

// ─── DELETE /api/entries/:date ────────────────────────────────────────────────
exports.deleteEntry = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user._id;

    const entry = await DailyEntry.findOneAndDelete({ user: userId, date });
    if (!entry) {
      return res.status(404).json({ error: 'No entry found for this date.' });
    }

    const streakData = await recalculateStreak(userId);

    res.json({ message: 'Entry deleted.', streak: streakData });
  } catch (err) {
    console.error('Delete entry error:', err);
    res.status(500).json({ error: 'Server error deleting entry.' });
  }
};

// ─── GET /api/entries ─────────────────────────────────────────────────────────
// Returns all entries for the authenticated user (paginated, most recent first)
exports.getEntries = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 365, offset = 0, from, to } = req.query;

    const filter = { user: userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const entries = await DailyEntry.find(filter)
      .sort({ date: -1 })
      .skip(Number(offset))
      .limit(Math.min(Number(limit), 500))
      .lean();

    res.json({ entries, count: entries.length });
  } catch (err) {
    console.error('Get entries error:', err);
    res.status(500).json({ error: 'Server error fetching entries.' });
  }
};

// ─── GET /api/entries/calendar/:year/:month ───────────────────────────────────
exports.getCalendarMonth = async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user._id;

    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = dayjs(from).endOf('month').format('YYYY-MM-DD');

    const entries = await DailyEntry.find({
      user: userId,
      date: { $gte: from, $lte: to },
    }).lean();

    // Return as a map: { "YYYY-MM-DD": { value, note } }
    const map = {};
    entries.forEach((e) => {
      map[e.date] = { value: e.value, note: e.note, id: e._id };
    });

    res.json({ calendar: map, month: from.slice(0, 7) });
  } catch (err) {
    console.error('Calendar fetch error:', err);
    res.status(500).json({ error: 'Server error fetching calendar.' });
  }
};

// ─── GET /api/entries/export ──────────────────────────────────────────────────
exports.exportEntries = async (req, res) => {
  try {
    const userId = req.user._id;
    const entries = await DailyEntry.find({ user: userId })
      .sort({ date: 1 })
      .lean();

    const csv = [
      'date,value,note',
      ...entries.map((e) => `${e.date},${e.value},"${(e.note || '').replace(/"/g, '""')}"`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plus-one-progress.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Server error exporting data.' });
  }
};
