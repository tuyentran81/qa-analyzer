const express = require('express');
const router = express.Router();
const controller = require('../controllers/analysis.controller');

router.post('/analyses', controller.createAnalysis);
router.get('/analyses', controller.listAnalyses);
router.get('/analyses/:id', controller.getAnalysis);
router.delete('/analyses/:id', controller.deleteAnalysis);

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

module.exports = router;
