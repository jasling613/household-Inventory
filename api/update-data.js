import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Debug 請求方法與 body
    console.log("req.method:", req.method);
    console.log("Request body:", req.body);

    const { id, newQuantity } = req.body;
    if (!id || newQuantity === undefined) {
      return res.status(400).json({ success: false, message: "Missing id or newQuantity" });
    }

    // 🔎 Debug 環境變數
    console.log("GOOGLE_CLIENT_EMAIL:", process.env.GOOGLE_CLIENT_EMAIL);
    console.log("GOOGLE_PRIVATE_KEY length:", process.env.GOOGLE_PRIVATE_KEY?.length);
    console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID);

    // 建立 Google Sheets 認證
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 讀取 ID 欄位，找到對應列
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "HouseInventory!A:A",
    });

    const rows = getResponse.data.values;
    console.log("Rows from sheet:", rows);

    if (!rows) {
      return res.status(404).json({ success: false, message: "Sheet is empty or could not be read" });
    }

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: `Item with ID ${id} not found` });
    }

    // Google Sheet 是 1-indexed，且資料從第 2 列開始
    const rowToUpdate = rowIndex + 2;

    console.log(`Updating row ${rowToUpdate} with new quantity: ${newQuantity}`);

    // 更新數量 (E 欄)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `HouseInventory!E${rowToUpdate}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[newQuantity]],
      },
    });

    return res.status(200).json({ success: true, message: "Quantity updated successfully" });
  } catch (error) {
    console.error("Error updating data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      details: error.response?.data || null,
    });
  }
}
