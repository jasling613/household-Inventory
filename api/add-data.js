import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("req.method:", req.method);
    console.log("req.body:", req.body);

    const { newRow } = req.body;
    if (!newRow || !Array.isArray(newRow)) {
      return res.status(400).json({ success: false, message: "Invalid request body" });
    }

    // 🔎 Debug 環境變數
    console.log("GOOGLE_CLIENT_EMAIL:", process.env.GOOGLE_CLIENT_EMAIL);
    console.log("GOOGLE_PRIVATE_KEY length:", process.env.GOOGLE_PRIVATE_KEY?.length);
    console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID);

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // 🔎 Debug 認證物件
    console.log("Auth object created:", auth);

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 🔎 Debug API 呼叫參數
    console.log("Appending row:", newRow);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "HouseInventory!A2:H",
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });

    return res.status(200).json({ success: true, message: "Data added successfully" });
  } catch (error) {
    console.error("Error adding data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      details: error.response?.data || null,
    });
  }
}