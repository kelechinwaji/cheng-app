const path = require('path');
const cors = require('cors');
const express = require('express');
const api = require('./src/routes/api');

const port = process.env.PORT || 1337;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', api);

// Backward-compatible demo endpoints
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Finance app running on http://localhost:${port}`);
  });
}

module.exports = app;
