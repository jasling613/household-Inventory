
# 家居計算表應用程式藍圖

## 專案概述

這是一個 React 應用程式，旨在幫助使用者有效率地追蹤和管理家居物品。使用者可以查看物品清單，並透過批次處理的方式快速新增多筆物品。所有資料都與 Google Sheet 即時同步。

## 功能

*   **查看物品清單**：在主頁上以表格形式即時顯示 Google Sheet 中的所有物品。
*   **批次新增物品**：提供一個高效率的新增頁面，使用者可以：
    1.  從 Excel 或 Google Sheet 中複製多筆資料。
    2.  將資料直接貼到一個大型文字方塊中。
    3.  系統會解析以 Tab 分隔的資料（物品種類ID, 物品種類, 物品名稱），並以表格形式提供預覽。
    4.  使用者確認無誤後，即可一次性將所有資料提交并新增到 Google Sheet 中。
*   **Google Sheet 整合**：從 Google Sheet 讀取資料並將新物品寫入其中。
*   **頁面導航**：在不同頁面之間輕鬆導航。

## 技術棧

*   **前端**：React, Vite
*   **UI 元件庫**：Material-UI (MUI)
*   **路由**：React Router DOM
*   **Google Sheets API**

## 開發歷史

1.  **專案初始化**：使用 Vite 建立 React 專案，并安裝 `react-router-dom`。
2.  **MUI 整合**：安裝並設定 Material-UI (`@mui/material`) 以用於 UI 元件。
3.  **基礎頁面與路由**：建立主頁 (`HomePage`) 和新增頁面 (`AddInventoryPage`)，並使用 React Router 設定路由。
4.  **Google Sheet API 整合**：
    *   在 `index.html` 中引入 Google API 指令碼。
    *   在 `HomePage` 中實作讀取和顯示物品清單的功能。
    *   在 `AddInventoryPage` 中實作新增單一物品的功能。
5.  **功能優化：下拉式選單**：將新增頁面的輸入欄位改為聯動的下拉式選單，從現有資料中讀取選項。
6.  **功能演進：批次新增**：根據使用者回饋，將新增頁面重構成一個支援批次處理的介面，允許使用者貼上多筆資料並進行預覽後提交，大幅提升了資料輸入效率。

