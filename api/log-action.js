export async function logAction({ action, itemTypeId, itemName, quantity, newQuantity }) {
  try {
    const now = new Date();
    const timestamp = now
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

    const newRow = [timestamp, action, itemTypeId, itemName, quantity, newQuantity];

    const response = await fetch("/api/add-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newRow }),
    });

    const result = await response.json();
    if (!result.success) {
      console.error("❌ Error logging action:", result.message);
      return null;
    }

    console.log("✅ Action logged:", result);
    return result;
  } catch (err) {
    console.error("❌ Network error logging action:", err);
    return null;
  }
}
