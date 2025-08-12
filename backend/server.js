const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const quoteRoutes = require('./routes/quoteRoutes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', quoteRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
