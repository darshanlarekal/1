const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

router.use(protect);

router.get('/dashboard', analyticsController.getDashboard);

module.exports = router;
