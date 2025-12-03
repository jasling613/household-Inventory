import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const body = req.body; // 不要再 JSON.parse

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.replace(/\\n/g, '\n'),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const range = "HouseInventory!A2:H"; // 確認工作表名稱正確

    const values = [[
      body.nextId,
      body.itemTypeId,
      body.itemType,
      body.itemName,
      body.quantity,
      body.unitPrice,
      body.purchaseDate,
      body.expirationDate
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return res.status(200).json({ success: true, message: "Data added successfully" });
  } catch (error) {
    console.error("Error adding data:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}
