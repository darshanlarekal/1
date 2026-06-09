const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const entriesController = require('../controllers/entriesController');

// All entry routes require authentication
router.use(protect);

// GET all entries (with optional date range filter)
router.get('/', entriesController.getEntries);

// GET export as CSV
router.get('/export', entriesController.exportEntries);

// GET calendar data for a specific month
router.get(
  '/calendar/:year/:month',
  [
    param('year').isInt({ min: 2020, max: 2100 }).withMessage('Invalid year'),
    param('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  ],
  entriesController.getCalendarMonth
);

// POST add a new entry
router.post(
  '/',
  [
    body('value')
      .isIn([-1, 0, 1])
      .withMessage('Value must be -1, 0, or 1'),
    body('note')
      .optional()
      .isLength({ max: 140 })
      .withMessage('Note cannot exceed 140 characters'),
    body('date')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
  ],
  entriesController.addEntry
);

// PATCH edit an existing entry by date
router.patch(
  '/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('value')
      .isIn([-1, 0, 1])
      .withMessage('Value must be -1, 0, or 1'),
    body('note')
      .optional()
      .isLength({ max: 140 })
      .withMessage('Note cannot exceed 140 characters'),
  ],
  entriesController.editEntry
);

// DELETE an entry by date
router.delete(
  '/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
  ],
  entriesController.deleteEntry
);

module.exports = router;
