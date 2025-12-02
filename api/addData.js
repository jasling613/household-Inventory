import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const body = JSON.parse(req.body);

    // 建立 JWT 驗證
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // 換行符號修正
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    // 初始化 Google Sheets API
    const sheets = google.sheets({ version: "v4", auth });

    // 你的 Google Sheet ID
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 要寫入的範圍 (例如 Sheet1!A:C)
    const range = "HouseInventory!A2:H";

    // 要寫入的資料 (一列)
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
