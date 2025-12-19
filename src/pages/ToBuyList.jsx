import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Box, Typography, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
  Checkbox, List, ListItem, ListItemText, TextField,
  FormControl, InputLabel, Select, MenuItem,
  InputAdornment, Autocomplete,TableContainer,Avatar,
} from '@mui/material';

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';

function ToBuyList({ onBack }) {
  const [items, setItems] = useState([]);
  const [shoppingMode, setShoppingMode] = useState(true);
  const [checked, setChecked] = useState({});
  const [showBought, setShowBought] = useState(false); // 預設隱藏已買
  const [justToggled, setJustToggled] = useState(null); // 👈 新增暫存狀態

  // 新增表單 state
  const [newId, setNewId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newLocation, setNewLocation] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // dropdown List
  const [itemNameOptions, setItemNameOptions] = useState([]);
  const quantityOptions = Array.from({ length: 10 }, (_, i) => String(i + 1));

// 📖 用 gapi 讀取 ToBuyList + GoodsID
useEffect(() => {
  const loadData = () => {
    // 1. 讀取 ToBuyList
    window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'ToBuyList!A2:G',
    }).then((response) => {
      const rows = response.result.values || [];
      setItems(rows);

      // 自動生成下一個 ID
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const lastId = lastRow[0]; // A 欄是 ID
        if (lastId && /^B\d{5}$/.test(lastId)) {
          const num = parseInt(lastId.slice(1), 10);
          const nextId = `B${String(num + 1).padStart(5, '0')}`;
          setNewId(nextId);
        } else {
          setNewId('B00001');
        }
      } else {
        setNewId('B00001');
      }
    }, (err) => {
      console.error('Error fetching ToBuyList:', err);
    });

    // 2. 讀取 GoodsID 的 C 欄 → 下拉選單選項
    window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'GoodsID!C2:C',
    }).then((response) => {
      const values = response.result.values?.flat().filter(v => v) || [];
      setItemNameOptions(values); // ✅ 更新 dropdown list 選項
    }, (err) => {
      console.error('Error fetching GoodsID:', err);
    });
  };

  const initClient = () => {
    const GAPI_READ_API_KEY = import.meta.env.VITE_GAPI_READ_API_KEY;
    window.gapi.client.init({
      apiKey: GAPI_READ_API_KEY,
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(loadData);
  };

  if (window.gapi) {
    window.gapi.load('client', initClient);
  }
}, []);

// 勾選已購買 → 更新狀態 (樂觀更新 + 延遲隱藏)
const handleToggle = async (id) => {
  const currentItem = items.find((row) => row[0] === id);
  const isBought = currentItem && currentItem[5] === "已買";
  const newStatus = isBought ? "待買" : "已買";

  // 樂觀更新 UI
  setItems((prevItems) =>
    prevItems.map((row) =>
      row[0] === id ? [...row.slice(0, 5), newStatus, ...row.slice(6)] : row
    )
  );

  setJustToggled(id);
  setTimeout(() => setJustToggled(null), 500);

  // 1️⃣ ActionLog payload
  const payloadLog = {
    action: newStatus === "已買" ? "已買(購物)" : "未買(購物)",
    itemTypeId: "", // 後端會查 GoodsID
    itemName: currentItem[1], // 品名在第2欄
    quantity: currentItem[2], // 數量在第3欄
    newQuantity: newStatus === "已買" ? "已購買" : "待購買",
  };

  // 2️⃣ ToBuyList payload
  const payloadToBuy = {
    action: "updateStatus",
    id,
    status: newStatus,
  };

  try {
    // ActionLog
    await fetch("/api/log-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadLog),
    });

    // ToBuyList
    const response = await fetch("/api/add-to-buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToBuy),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    if (!result.success) {
      console.error("Update failed:", result.message);
      // 回滾 UI
      setItems((prevItems) =>
        prevItems.map((row) =>
          row[0] === id
            ? [...row.slice(0, 5), isBought ? "已買" : "待買", ...row.slice(6)]
            : row
        )
      );
    }
  } catch (err) {
    console.error("Error updating status:", err);
    // 回滾 UI
    setItems((prevItems) =>
      prevItems.map((row) =>
        row[0] === id
          ? [...row.slice(0, 5), isBought ? "已買" : "待買", ...row.slice(6)]
          : row
      )
    );
  }
};




  // 新增待買項目
// 新增待買項目
const handleAddToBuy = async () => {
  setSubmitted(true);

  if (!newItemName || newItemName.trim() === '') {
    return;
  }

  const unitPriceValue = newUnitPrice && newUnitPrice.trim() !== ''
    ? Number(newUnitPrice)
    : 0;

  // ActionLog payload
  const payloadLog = {
    action: "新增(購物)",
    itemTypeId: "",   // 後端會查 GoodsID
    itemName: newItemName,
    quantity: newQuantity,
    newQuantity: "待購買",
  };

  // ToBuyList row
  const newRow = [
    newId,
    newItemName,
    newQuantity,
    newLocation && newLocation.trim() !== '' ? newLocation : '待定',
    unitPriceValue,
    '待買',
    newPriority,
  ];

  try {
    // 1️⃣ ActionLog
    await fetch('/api/log-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadLog),
    });

    // 2️⃣ ToBuyList
    await fetch('/api/add-to-buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "add", newRow }),
    });

    // 更新前端清單顯示
    setItems([...items, newRow]);

    // 更新下一個 ID
    const num = parseInt(newId.slice(1), 10);
    const nextId = `B${String(num + 1).padStart(5, '0')}`;
    setNewId(nextId);

    // 清空表單
    setNewItemName('');
    setNewQuantity(1);
    setNewLocation('');
    setNewUnitPrice('');
    setNewPriority('');
    setSubmitted(false);

  } catch (err) {
    console.error('Error adding to ToBuyList:', err);
  }
};



    // 👇 新增過濾邏輯放這裡
    const visibleItems = showBought
    ? items
    : items.filter((row) => row[5] !== "已買" || row[0] === justToggled);

  return (
<Container maxWidth="md">
  <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
    {/* 頂部列：左邊 Logo + 右邊按鈕 */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
      }}
    >
      {/* 左上角 Logo */}
      <Avatar
        src="/favicon.png"
        alt="Logo"
        variant="square"
        sx={{ width: 40, height: 40 }}
      />

      {/* 右上角按鈕 */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button
          variant="outlined"
          onClick={() => setShoppingMode(!shoppingMode)}
        >
          {shoppingMode ? "返回表格模式" : "購物模式"}
        </Button>
        <Button variant="outlined" onClick={onBack}>
          返回庫存
        </Button>
      </Box>
    </Box>

    {/* 下一行置中標題 */}
    <Box sx={{ textAlign: "center", mb: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold" }}>
        待買清單
      </Typography>
    </Box>

{/* 新增待買項目表單 */}
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
  {/* 第一行：ID + 物品名稱 → 各佔 50% */}
  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
  <TextField label="ID" value={newId} disabled sx={{ flex: 1 }} />

  <Autocomplete
    freeSolo
    options={itemNameOptions}
    value={newItemName}
    onChange={(event, newValue) => setNewItemName(newValue)}
    onInputChange={(event, newInputValue) => setNewItemName(newInputValue)}
    sx={{ flex: 1 }}   // ✅ 外層也要 flex:1
    renderInput={(params) => (
      <TextField
        {...params}
        label="物品名稱"
        required
        error={submitted && (!newItemName || newItemName.trim() === '')}
        helperText={
          submitted && (!newItemName || newItemName.trim() === '')
            ? '物品名稱必須填寫'
            : ''
        }
      />
    )}
  />
</Box>


  {/* 第二行：數量 + 購買地點 */}
  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
    <Autocomplete
      value={newQuantity.toString()}
      onChange={(event, newValue) => {
        setNewQuantity(parseInt(newValue, 10) || 1);
      }}
      onInputChange={(event, newInputValue) => {
        const newQuantity = parseInt(newInputValue, 10);
        if (!isNaN(newQuantity) && newQuantity > 0) {
          setNewQuantity(newQuantity);
        }
      }}
      freeSolo
      disablePortal
      options={quantityOptions}
      sx={{ flex: 1 }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="數量"
          type="number"
          required
          InputProps={{
            ...params.InputProps,
            inputProps: { ...params.inputProps, min: 1 },
          }}
        />
      )}
    />

    <TextField
      label="購買地點"
      value={newLocation}
      onChange={(e) => setNewLocation(e.target.value)}
      sx={{ flex: 1 }}
    />
  </Box>

  {/* 第三行：單價 + 優先度 */}
  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
    <TextField
      label="預估單價"
      type="number"
      value={newUnitPrice}
      onChange={(e) => setNewUnitPrice(e.target.value)}
      required
      InputProps={{
        inputProps: { min: 0, step: "0.1" },
        startAdornment: <InputAdornment position="start">$</InputAdornment>,
      }}
      sx={{ flex: 1 }}
    />

    <FormControl sx={{ flex: 1 }}>
      <InputLabel id="priority-label">優先度</InputLabel>
      <Select
        labelId="priority-label"
        id="priority-select"
        value={newPriority}
        onChange={(e) => setNewPriority(e.target.value)}
        label="優先度"
      >
        <MenuItem value="高">高</MenuItem>
        <MenuItem value="中">中</MenuItem>
        <MenuItem value="低">低</MenuItem>
      </Select>
    </FormControl>
  </Box>

  {/* 第四行：新增按鈕 */}
  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
    <Button variant="contained" onClick={handleAddToBuy}>
      新增
    </Button>
  </Box>
</Box>

        {/* 表格模式 */}
        {!shoppingMode && (
  <TableContainer component={Paper} variant="outlined" sx={{ mt: 3, overflowX: "auto" }}>
    <Table sx={{ minWidth: 650 }} aria-label="to-buy-table">
      <TableHead>
        <TableRow>
          <TableCell align="center">ID</TableCell>
          <TableCell align="center">物品名稱</TableCell>
          <TableCell align="center">數量</TableCell>
          <TableCell align="center">購買地點</TableCell>
          <TableCell align="center">預估單價</TableCell>
          <TableCell align="center">狀態</TableCell>
          <TableCell align="center">優先度</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.length > 0 ? (
          items.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, i) => (
                <TableCell key={i} align="center">
                  {i === 3
                    ? (cell && cell.trim() !== '' ? cell : '待定')   // 👈 購買地點空白顯示待定
                    : i === 4
                      ? (Number(cell) === 0 ? '待定' : `$${cell}`)   // 👈 單價 0 顯示待定
                      : cell}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} align="center">
              目前沒有待買項目
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
)}
        
        {/* 購物模式：簡化清單 + Checkbox */}
{shoppingMode && (
  <Box sx={{ mt: 3 }}>

    {/* 顯示/隱藏已買切換按鈕 */}
    <Button
      variant="outlined"
      onClick={() => setShowBought((prev) => !prev)}
      sx={{ mb: 2 }}
    >
      {showBought ? "隱藏已買" : "顯示已買"}
    </Button>

    {/* ✅ 只顯示已買 */}
    {showBought && (
      <List>
        {visibleItems
          .filter(row => row[5] === "已買")   // ✅ 只留下已買
          .reverse()   // ✅ 倒序
          .map((row, index) => {
            const id = row[0];
            const itemName = row[1];
            const quantity = row[2];
            const location = row[3];
            const unitPrice = row[4];
            const status = row[5];
            const priority = row[6];

            return (
              <ListItem
                key={index}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Checkbox
                  checked={status === "已買"}
                  onChange={() => handleToggle(id)}
                />
                <ListItemText
                  primary={`${id} - ${itemName} (數量: ${quantity})`}
                  secondary={
                    `${location ? `地點: ${location}` : "地點: 待定"} | ` +
                    `${unitPrice && Number(unitPrice) !== 0 ? `單價: $${unitPrice}` : "單價: 待定"} | ` +
                    `優先度: ${priority ? priority : "待定"}`
                  }
                />
              </ListItem>
            );
          })}
      </List>
    )}

    {/* ✅ 不顯示已買 → 顯示未買 */}
    {!showBought && (
      <List>
        {visibleItems
          .filter(row => row[5] !== "已買")   // ✅ 只留下未買
          .map((row, index) => {
            const id = row[0];
            const itemName = row[1];
            const quantity = row[2];
            const location = row[3];
            const unitPrice = row[4];
            const status = row[5];
            const priority = row[6];

            return (
              <ListItem
                key={index}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Checkbox
                  checked={status === "已買"}
                  onChange={() => handleToggle(id)}
                />
                <ListItemText
                  primary={`${id} - ${itemName} (數量: ${quantity})`}
                  secondary={
                    `${location ? `地點: ${location}` : "地點: 待定"} | ` +
                    `${unitPrice && Number(unitPrice) !== 0 ? `單價: $${unitPrice}` : "單價: 待定"} | ` +
                    `優先度: ${priority ? priority : "待定"}`
                  }
                />
              </ListItem>
            );
          })}
      </List>
    )}

  </Box>
)}


      </Paper>
    </Container>
    );}
export default ToBuyList;