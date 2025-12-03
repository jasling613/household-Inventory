import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { newRow } = req.body;

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "HouseInventory!A2:H",
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });

    return res.status(200).json({ success: true, message: "Data added successfully" });
  } catch (error) {
    console.error("Error adding data:", error.response?.data || error.message || error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}