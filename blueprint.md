
# 家居計算表應用程式藍圖

## 專案概述

這是一個 React 應用程式，旨在幫助使用者有效率地追蹤和管理家居物品。使用者可以查看物品清單，並透過表單新增單一物品。所有資料都與 Google Sheet 即時同步。

## 功能

*   **查看物品清單**：在主頁上以表格形式即時顯示 Google Sheet 中的所有物品。
*   **新增物品**：提供一個表單介面，使用者可以：
    *   從聯動的下拉式選單中選擇「物品種類」和「物品名稱」。
    *   系統會自動帶出對應的 ID。
    *   填寫數量、價格和日期等資訊。
    *   提交表單，將新物品即時寫入 Google Sheet。
*   **Google Sheet 整合**：從 Google Sheet 讀取資料並將新物品寫入其中。
*   **前後端分離**：建立一個 Node.js (Express) 後端伺服器，專門處理對 Google Sheet 的寫入請求，提高了應用的安全性和可擴展性。

## 技術棧

*   **前端**：React, Vite
*   **後端**：Node.js, Express
*   **UI 元件庫**：Material-UI (MUI)
*   **API 客戶端**：Google APIs aab` for Node.js
*   **環境變數管理**：`dotenv`

## 開發歷史

1.  **專案初始化**：使用 Vite 建立 React 專案，并安裝 `react-router-dom`。
2.  **MUI 整合**：安裝並設定 Material-UI (`@mui/material`) 以用於 UI 元件。
3.  **基礎頁面與路由**：建立主頁 (`HomePage`)，用於顯示和新增物品。
4.  **Google Sheet API 整合 (前端)**：
    *   在 `index.html` 中引入 Google API 指令碼。
    *   在 `HomePage` 中實作讀取和顯示物品清單的功能。
5.  **功能優化：下拉式選單**：將新增物品的輸入欄位改為聯動的下拉式選單，從現有資料中讀取選項，提升了輸入的準確性。
6.  **架構重構：前後端分離**：
    *   建立 `server.cjs`，使用 Node.js 和 Express 建立後端伺服器。
    *   將寫入 Google Sheet 的邏輯從前端移至後端，透過 API 端點 `/api/add-data` 進行操作。
    *   使用服務帳號 (Service Account) 金鑰進行後端驗證，取代了前端的 OAuth 流程，提高了安全性。
    *   設定了 CORS 策略，確保只有指定的網域可以存取後端 API。
7.  **深度除錯與問題解決**：
    *   **問題**：後端在寫入 Google Sheet 時持續返回 500 錯誤，前端收到的錯誤訊息為 `invalid_grant: Invalid grant: account not found`。
    *   **除錯過程**：
        1.  **前端追蹤**：修改前端 `HomePage.jsx`，使其能捕捉並完整顯示從後端傳來的詳細錯誤物件。
        2.  **後端追蹤**：修改後端 `server.cjs`，使其在 `catch` 區塊中捕捉 Google API 的原始錯誤，並將其傳給前端。
        3.  **定位錯誤**：透過上述追蹤，最終在瀏覽器主控台中確認了來自 Google API 的原始錯誤為 `invalid_grant`，指向身份驗證問題。
        4.  **解決方案**：在使用者提示工作表名稱為 `HouseInventory` 後，意識到問題可能出在 `append` API 的 `range` 參數上。將 `range` 的值從 `'HouseInventory!A1'` 修改為 `'HouseInventory'`，讓 API 自行決定附加資料的位置。此修改成功解決了問題。
    *   **結論**：這個經驗表明，Google API 的錯誤訊息有時可能具有誤導性 (`invalid_grant` 實際是由於 `range` 參數不當引起)，以及在除錯時建立完整的前後端錯誤追蹤鏈是至關重要的。
8.  **程式碼清理**：問題解決後，清理了前後端為除錯而加入的詳細錯誤傳遞程式碼，將敏感錯誤保留在伺服器日誌中，提高了應用的安全性。

