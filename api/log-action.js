export async function logAction({ action, itemTypeId, itemName, quantity, newQuantity }) {
    try {
      // 產生 日-月-年 上午/下午 hh:mm:ss 格式的 timestamp
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
          hour12: true, // ✅ 使用 12 小時制，會顯示 上午/下午
        })
        .replace(/\//g, "-")
        .replace(",", "");
  
      const response = await fetch("/api/log-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp, action, itemTypeId, itemName, quantity, newQuantity }),
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
  