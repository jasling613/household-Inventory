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

// ➕ 新增物品 HouseInventory
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

// ✏️ 更新數量（扣減 / 增加） HouseInventory
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

    
    // 先讀取 ID 欄位 HouseInventory
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





// 🛒 統一的多 action API ToBuyList
app.post('/api/add-to-buy', async (req, res) => {
  try {
    console.log("Received payload:", req.body);
    const { action, newRow, id, status, priority, quantity } = req.body;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // ➕ 新增待買項目 ToBuyList
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

    // ✏️ 更新狀態 ToBuyList
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

    // ✏️ 更新優先度 ToBuyList
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

    // ✏️ 更新數量update ToBuyList
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


//Log Action
app.post('/api/log-action', async (req, res) => {
  try {
    let { timestamp, action, itemTypeId, itemName, quantity, newQuantity } = req.body;
    if (!action || !itemName) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // ✅ 優先用前端送來的 timestamp，沒有才自己生成
    const logTimestamp = timestamp || new Date()
      .toLocaleString("zh-HK", {
        timeZone: "Asia/Hong_Kong",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
      .replace(/\//g, "-")
      .replace(",", "");

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 🛒 如果是購物清單動作 → 查 GoodsID sheet
    if (action.includes("(購物)")) {
      const goods = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "GoodsID!A:C", // A=種類ID, B=種類, C=品名
      });
    
      const cleanName = itemName.trim();
      const match = goods.data.values.find(row => row[2].trim() === cleanName); // 比對 C 欄品名
      itemTypeId = match ? match[0] : "N/A"; // 取 A 欄種類ID
      
      

      // newQuantity 在購物清單語境下就是狀態
      if (action === "新增(購物)") newQuantity = "待購買";
      else if (action === "已買(購物)") newQuantity = "已購買";
      else if (action === "未買(購物)") newQuantity = "待購買";
    }

    const logRow = [logTimestamp, action, itemTypeId, itemName, quantity, newQuantity];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ActionLog!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [logRow] },
    });

    return res.json({ success: true, message: 'Action logged successfully' });
  } catch (error) {
    console.error('Error in /api/log-action:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server started, listening on http://0.0.0.0:${port}`);
});
