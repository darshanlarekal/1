const mongoose = require('mongoose');

const dailyEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Store YYYY-MM-DD as a plain string — timezone-safe, no time component
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    // -1, 0, or +1
    value: {
      type: Number,
      required: [true, 'Value is required'],
      enum: {
        values: [-1, 0, 1],
        message: 'Value must be -1, 0, or 1',
      },
    },
    // Optional short note (max 140 chars, one-line intention)
    note: {
      type: String,
      maxlength: [140, 'Note cannot exceed 140 characters'],
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound index: one entry per user per date ──────────────────────────────
// unique: true enforces the "one entry per day" rule at the DB level
dailyEntrySchema.index({ user: 1, date: 1 }, { unique: true });

// ─── Index for fetching entries in order ─────────────────────────────────────
dailyEntrySchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('DailyEntry', dailyEntrySchema);
