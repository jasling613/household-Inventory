import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { timestamp, action, itemTypeId, itemName, quantity, newQuantity } = req.body;
    if (!action || !itemTypeId || !itemName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const logRow = [timestamp, action, itemTypeId, itemName, quantity, newQuantity];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "ActionLog!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [logRow] },
    });

    return res.status(200).json({ success: true, message: "Action logged successfully" });
  } catch (error) {
    console.error("Error logging action:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      details: error.response?.data || null,
    });
  }
}
