const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';
const port = 3001;

const corsOptions = {
  origin: /https?:\/\/(\d+-)?firebase-household-1764379851790\.cluster-ikxjzjhlifcwuroomfkjrx437g\.cloudworkstations\.dev/,
};

let credentials;
const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

if (!rawCredentials) {
    console.error("FATAL ERROR: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable not found.");
    process.exit(1);
}

try {
    credentials = JSON.parse(rawCredentials);
} catch (error) {
    console.error("FATAL ERROR: Could not parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.", error.message);
    process.exit(1);
}

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
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'HouseInventory!A1',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [newRow],
            },
        });

        return res.status(200).json({ success: true, data: response.data });

    } catch (error) {
        console.error('Error during /api/add-data processing:', error);
        return res.status(500).json({
            success: false, 
            message: 'An internal server error occurred.',
            error: {
                name: error.name,
                message: error.message
            }
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server started, listening on http://0.0.0.0:${port}`);
});
