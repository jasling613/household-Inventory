import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { action, newRow, id, status, priority, quantity } = req.body;

    // 建立 Google Sheets 驗證
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // ➕ 新增待買項目
    if (action === "add") {
      if (!newRow || !Array.isArray(newRow)) {
        return res.status(400).json({ success: false, message: "Invalid newRow" });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "ToBuyList!A:G",
        valueInputOption: "USER_ENTERED",
        resource: { values: [newRow] },
      });

      return res.status(200).json({ success: true, message: "Item added successfully" });
    }

    // ✏️ 更新購物模式狀態（待買 ↔ 已買）
    if (action === "updateStatus") {
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

      const rowNumber = rowIndex + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `ToBuyList!F${rowNumber}`, // F 欄是狀態
        valueInputOption: "RAW",
        resource: { values: [[status]] },
      });

      return res.status(200).json({ success: true, message: "Status updated successfully" });
    }

    // ✏️ 更新優先度
    if (action === "updatePriority") {
      if (!id || !priority) {
        return res.status(400).json({ success: false, message: "Missing id or priority" });
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

      const rowNumber = rowIndex + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `ToBuyList!G${rowNumber}`, // G 欄是優先度
        valueInputOption: "RAW",
        resource: { values: [[priority]] },
      });

      return res.status(200).json({ success: true, message: "Priority updated successfully" });
    }

    // ✏️ 更新數量
    if (action === "updateQuantity") {
      if (!id || quantity === undefined) {
        return res.status(400).json({ success: false, message: "Missing id or quantity" });
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

      const rowNumber = rowIndex + 2;

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `ToBuyList!C${rowNumber}`, // C 欄是數量
        valueInputOption: "USER_ENTERED",
        resource: { values: [[quantity]] },
      });

      return res.status(200).json({ success: true, message: "Quantity updated successfully" });
    }

    // 如果 action 不符合任何分支
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
