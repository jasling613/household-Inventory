const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';
const port = 3001;

// CORS 設定，允許 Cloud Workstations + localhost
const corsOptions = {
  origin: [/https?:\/\/.*\.cloudworkstations\.dev/, "http://localhost:5173"],
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

// 🛒 統一的多 action API
app.post('/api/add-to-buy', async (req, res) => {
  try {
    console.log("Received payload:", req.body);
    const { action, newRow, id, status, priority, quantity } = req.body;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // ➕ 新增待買項目
    if (action === "add") {
      if (!newRow || !Array.isArray(newRow)) {
        return res.json({ success: false, message: "Invalid newRow" });
      }
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "ToBuyList!A:G",
        valueInputOption: "USER_ENTERED",
        resource: { values: [newRow] },
      });
      return res.json({ success: true, message: "Item added successfully" });
    }

    // ✏️ 更新狀態
    if (action === "updateStatus") {
      if (!id || !status) {
        return res.json({ success: false, message: "Missing id or status" });
      }
      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "ToBuyList!A:A",
      });
      const rows = readRes.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] && row[0].trim() === id.trim());
      if (rowIndex === -1) {
        return res.json({ success: false, message: "ID not found in sheet" });
      }
      const rowNumber = rowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `ToBuyList!F${rowNumber}`,
        valueInputOption: "RAW",
        resource: { values: [[status]] },
      });
      return res.json({ success: true, message: "Status updated successfully" });
    }

    // ✏️ 更新優先度
    if (action === "updatePriority") {
      if (!id || !priority) {
        return res.json({ success: false, message: "Missing id or priority" });
      }
      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "ToBuyList!A:A",
      });
      const rows = readRes.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] && row[0].trim() === id.trim());
      if (rowIndex === -1) {
        return res.json({ success: false, message: "ID not found in sheet" });
      }
      const rowNumber = rowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `ToBuyList!G${rowNumber}`,
        valueInputOption: "RAW",
        resource: { values: [[priority]] },
      });
      return res.json({ success: true, message: "Priority updated successfully" });
    }

    // ✏️ 更新數量
    if (action === "updateQuantity") {
      if (!id || quantity === undefined) {
        return res.json({ success: false, message: "Missing id or quantity" });
      }
      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "ToBuyList!A:A",
      });
      const rows = readRes.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] && row[0].trim() === id.trim());
      if (rowIndex === -1) {
        return res.json({ success: false, message: "ID not found in sheet" });
      }
      const rowNumber = rowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `ToBuyList!C${rowNumber}`,
        valueInputOption: "USER_ENTERED",
        resource: { values: [[quantity]] },
      });
      return res.json({ success: true, message: "Quantity updated successfully" });
    }

    return res.json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error("Error in /api/add-to-buy:", error);
    res.json({ success: false, message: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server started, listening on http://0.0.0.0:${port}`);
});
