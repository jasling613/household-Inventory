import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Box, Typography, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
  Checkbox, List, ListItem, ListItemText, TextField,
  FormControl, InputLabel, Select, MenuItem,
  InputAdornment, Autocomplete,TableContainer
} from '@mui/material';

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';

function ToBuyList({ onBack }) {
  const [items, setItems] = useState([]);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [checked, setChecked] = useState({});

  // 新增表單 state
  const [newId, setNewId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newLocation, setNewLocation] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // 數量 dropdown List
  const quantityOptions = Array.from({ length: 10 }, (_, i) => String(i + 1));

  // 📖 用 gapi 讀取 ToBuyList
  useEffect(() => {
    const loadToBuyList = () => {
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
    };

    const initClient = () => {
      const GAPI_READ_API_KEY = import.meta.env.VITE_GAPI_READ_API_KEY;
      window.gapi.client.init({
        apiKey: GAPI_READ_API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      }).then(loadToBuyList);
    };

    if (window.gapi) {
      window.gapi.load('client', initClient);
    }
  }, []);

// 勾選已購買 → 更新狀態
const handleToggle = async (id) => {
  const newChecked = !checked[id];
  setChecked((prev) => ({ ...prev, [id]: newChecked }));

  const payload = {
    action: "updateStatus",   // 👈 和後端一致
    id,
    status: newChecked ? "已買" : "待買",
  };

  console.log("Sending payload:", payload); // 檢查送出的資料

  try {
    const response = await fetch("/api/add-to-buy", {   // 👈 改成 add-to-buy
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      // 更新 items 陣列裡的狀態 (第 6 欄 F)
      setItems((prevItems) =>
        prevItems.map((row) =>
          row[0] === id
            ? [...row.slice(0, 5), newChecked ? "已買" : "待買", ...row.slice(6)]
            : row
        )
      );
    } else {
      console.error("Update failed:", result.message);
    }
  } catch (err) {
    console.error("Error updating status:", err);
  }
};

  // 新增待買項目
  const handleAddToBuy = async () => {
    setSubmitted(true);

    if (!newItemName || newItemName.trim() === '') {
      return;
    }

    const unitPriceValue = newUnitPrice && newUnitPrice.trim() !== ''
      ? Number(newUnitPrice)
      : 0;

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
      const response = await fetch('/api/add-to-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',   // 👈 指定動作
          newRow,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
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
      } else {
        console.error('Add failed:', result.message);
      }
    } catch (err) {
      console.error('Error adding to ToBuyList:', err);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {/* 標題 + 返回按鈕 + 模式切換 */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }, // 手機垂直，桌面水平
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2, // 按鈕和標題之間留空間
              }}
            >
              <Typography variant="h4">待買清單</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShoppingMode(!shoppingMode)}
                >
                  {shoppingMode ? '返回表格模式' : '購物模式'}
                </Button>
                <Button variant="outlined" onClick={onBack}>返回庫存</Button>
              </Box>
            </Box>

        {/* 新增待買項目表單 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
  {/* 第一行：ID + 物品名稱 */}
  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
    <TextField label="ID" value={newId} disabled sx={{ flex: 1 }} />
    <TextField
      label="物品名稱"
      value={newItemName}
      onChange={(e) => setNewItemName(e.target.value)}
      required
      error={submitted && (!newItemName || newItemName.trim() === '')}
      helperText={submitted && (!newItemName || newItemName.trim() === '') ? '物品名稱必須填寫' : ''}
      sx={{ flex: 1 }}
    />
  </Box>

  {/* 第二行：數量 + 購買地點 */}
  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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
  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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
  <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
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
          <List sx={{ mt: 3 }}>
            {items.map((row, index) => {
              const id = row[0];
              const itemName = row[1];
              const quantity = row[2];
              const location = row[3];
              return (
                <ListItem key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox checked={!!checked[id]} onChange={() => handleToggle(id)} />
                  <ListItemText
                    primary={`${id} - ${itemName} (${quantity})`}
                    secondary={location ? `地點: ${location}` : ''}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
}

export default ToBuyList;