const generateQuotePDF = require('../utils/generateQuotePDF');

exports.createQuote = async (req, res) => {
  try {
    const pdfBuffer = await generateQuotePDF(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
    res.send(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate quote PDF' });
  }
};
