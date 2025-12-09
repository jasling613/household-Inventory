import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { newRow } = req.body;
    if (!newRow || !Array.isArray(newRow)) {
      return res.status(400).json({ success: false, message: "Invalid request body" });
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "ToBuyList!A:G",   // 👈 寫入待買清單
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    return res.status(200).json({ success: true, message: "Data added successfully" });
  } catch (error) {
    console.error("Error writing to ToBuyList:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      details: error.response?.data || null,
    });
  }
}
