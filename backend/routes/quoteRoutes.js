const express = require('express');
const router = express.Router();
const { createQuote } = require('../controllers/quoteController');

router.post('/generate-quote', createQuote);

module.exports = router;
