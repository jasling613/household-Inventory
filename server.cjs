const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';
const port = 3001;

// CORS 設定，允許 Cloud Workstations 前端呼叫
const corsOptions = {
  origin: /https?:\/\/.*\.cloudworkstations\.dev/,
  credentials: true,
  optionsSuccessStatus: 200
};

let credentials;
const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

if (!rawCredentials) {
  console.error("FATAL ERROR: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable not found.");
  process.exit(1);
}

try {
  credentials = JSON.parse(rawCredentials);
  if (credentials.client_email) {
    console.log(`[Gemini] ✅ Service Account Email: ${credentials.client_email}`);
    console.log(`[Gemini] 👉 請確認 Google Sheet '${SPREADSHEET_ID}' 已分享給這個帳號，並有編輯權限。`);
  }
} catch (error) {
  console.error("FATAL ERROR: Could not parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.", error.message);
  process.exit(1);
}

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// ➕ 新增物品
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
      resource: { values: [newRow] },
    });

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error during /api/add-data:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ✏️ 更新數量（扣減 / 增加）
app.post('/api/update-data', async (req, res) => {
  try {
    const { id, newQuantity } = req.body;
    if (!id || newQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'Missing id or newQuantity.' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 先讀取 ID 欄位
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'HouseInventory!A:A',
    });

    const rows = getResponse.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: `Item with ID ${id} not found.` });
    }

    const rowToUpdate = rowIndex + 1; // Google Sheets 是 1-indexed

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `HouseInventory!E${rowToUpdate}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[newQuantity]] },
    });

    return res.status(200).json({ success: true, message: 'Quantity updated successfully.' });
  } catch (error) {
    console.error('Error during /api/update-data:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// To Buy List
app.post('/api/add-to-buy', async (req, res) => {
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

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ToBuyList!A:G',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newRow] },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error writing to ToBuyList:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/update-to-buy-status', async (req, res) => {
  const { id, status } = req.body;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 先讀取整個 ToBuyList
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ToBuyList!A2:G',
    });

    const rows = readRes.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0].trim() === id.trim());

    console.log('Updating ID:', id, 'Found rowIndex:', rowIndex);

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: 'ID not found in sheet' });
    }

    // Google Sheet 是從第 2 行開始，所以要 +2
    const rowNumber = rowIndex + 2;
    console.log('Row number to update:', rowNumber);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `ToBuyList!F${rowNumber}`, // F 欄是狀態
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server started, listening on http://0.0.0.0:${port}`);
});
