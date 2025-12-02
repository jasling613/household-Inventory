const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';
const port = 3001;

// Updated allowedOrigins to include all previous and current URLs
const allowedOrigins = [
  /https?:\/\/(\d+-)?firebase-household-1764379851790\.cluster-ikxjzjhlifcwuroomfkjrx437g\.cloudworkstations\.dev/,
  /https?:\/\/(\d+-)?firebase-household-1764594951103\.cluster-ejd22kqny5htuv5dfowoyipt52\.cloudworkstations\.dev/,
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.some(regex => (typeof regex === 'string' ? regex === origin : regex.test(origin)))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

app.post('/api/add-data', async (req, res) => {
    try {
        const { newRow } = req.body;

        if (!newRow || !Array.isArray(newRow)) {
            return res.status(400).json({ success: false, message: 'Invalid data format.' });
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json', 
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'HouseInventory', 
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [newRow],
            },
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error during /api/add-data processing:', error);
        // Re-enabling detailed error response for debugging
        return res.status(500).json({
            success: false, 
            message: 'An internal server error occurred.',
            error: error.response ? error.response.data.error : { name: error.name, message: error.message, details: error.errors } 
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server started, listening on http://0.0.0.0:${port}`);
});
