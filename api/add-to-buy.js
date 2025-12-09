import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { action, newRow, id, status } = req.body;

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (action === "add") {
      // ➕ 新增待買項目
      if (!newRow || !Array.isArray(newRow)) {
        return res.status(400).json({ success: false, message: "Invalid newRow" });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "ToBuyList!A:G",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRow] },
      });

      return res.status(200).json({ success: true, message: "Item added successfully" });
    }

    if (action === "update") {
      // ✏️ 更新購物模式狀態
      if (!id || !status) {
        return res.status(400).json({ success: false, message: "Missing id or status" });
      }

      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "ToBuyList!A2:G",
      });

      const rows = readRes.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0].trim() === id.trim());

      if (rowIndex === -1) {
        return res.status(404).json({ success: false, message: "ID not found in sheet" });
      }

      const rowNumber = rowIndex + 2; // 因為 A2 是 rowIndex=0

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `ToBuyList!F${rowNumber}`, // F 欄是狀態
        valueInputOption: "RAW",
        requestBody: { values: [[status]] },
      });

      return res.status(200).json({ success: true, message: "Status updated successfully" });
    }

    return res.status(400).json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error("Error in add-to-buy handler:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      details: error.response?.data || null,
    });
  }
}
