import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Autocomplete,
  Avatar,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";   // 如果有用到勾選框
import customParseFormat from 'dayjs/plugin/customParseFormat';
import CustomCalendarHeader from '../components/CustomCalendarHeader';
import ToBuyList from './ToBuyList';

dayjs.extend(customParseFormat);
dayjs.locale('zh-cn');

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';

const formatId = (num) => String(num).padStart(6, '0');

const quantityOptions = Array.from({ length: 10 }, (_, i) => String(i + 1));

function HomePage() {
  const [inventoryData, setInventoryData] = useState([]);
  const [goodsIdData, setGoodsIdData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextId, setNextId] = useState('000001');

  // Form state
  const [itemTypeId, setItemTypeId] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('0');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [expirationDate, setExpirationDate] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSimplifiedInventory, setShowSimplifiedInventory] = useState(true);


  // Dropdown options
  const [itemTypeOptions, setItemTypeOptions] = useState([]);
  const [itemNameOptions, setItemNameOptions] = useState([]);
  const [itemNameFilterOptions, setItemNameFilterOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  // Filter state
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [itemNameFilter, setItemNameFilter] = useState('');

  // Consumption state
  const [consumptionItemId, setConsumptionItemId] = useState('');
  const [consumptionItemType, setConsumptionItemType] = useState(""); 
  const [consumptionItemName, setConsumptionItemName] = useState("");
  const [consumptionQuantity, setConsumptionQuantity] = useState(1);
  const [consumptionError, setConsumptionError] = useState(null);
  const [isConsuming, setIsConsuming] = useState(false);

  //To Buy List
  const [showToBuyList, setShowToBuyList] = useState(false);
  

  const loadSheetDataForReading = useCallback(() => {
    setLoading(true);
    setError(null);
    if (!window.gapi || !window.gapi.client) {
      setError('Google API 用戶端程式庫尚未完全載入。');
      setLoading(false);
      return;
    }
    window.gapi.client.sheets.spreadsheets.values
      .batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: ['HouseInventory!A2:I', 'GoodsID!A2:C', 'Location!A2:A'],
      })
      .then(
        (response) => {
          const inventoryRows = response.result.valueRanges[0].values || [];
          const formattedInventory = inventoryRows.map((row) => ({
            id: row[0],
            itemTypeId: row[1],
            itemType: row[2],
            itemName: row[3],
            quantity: row[4] || '1',
            unitPrice: row[5] || '0',
            purchaseLocation: row[6] || '',
            purchaseDate: row[7] ? dayjs(row[7], "DD-MM-YYYY") : null,   // H 欄
            expirationDate: row[8] ? dayjs(row[8], "DD-MM-YYYY") : null,
          }));
          setInventoryData(formattedInventory);

          if (inventoryRows.length > 0) {
            const lastRow = inventoryRows[inventoryRows.length - 1];
            const lastId = parseInt(lastRow[0], 10);
            if (!isNaN(lastId)) {
              setNextId(formatId(lastId + 1));
            }
          }
          // 處理 GoodsID
          const goodsIdRows = response.result.valueRanges[1].values || [];
          const goodsData = goodsIdRows.map(row => ({ id: row[0], type: row[1], name: row[2] }));
          setGoodsIdData(goodsData);

          // 在這裡加購買地點處理
          const locationRows = response.result.valueRanges[2].values || [];
          const locationOptions = locationRows.map(row => row[0]); // A 欄的值
          setLocationOptions(locationOptions);

          const uniqueTypes = [...new Set(goodsData.map(item => item.type))];
          setItemTypeOptions(uniqueTypes);
          setLoading(false);
        },
        (reason) => {
          console.error('Error fetching data: ', reason.result);
          const errorMessage = reason.result?.error?.message || '請檢查 Google Sheet 設定或 API 金鑰。';
          setError(`無法載入資料：${errorMessage}`);
          setLoading(false);
        }
      );
  }, []);

  useEffect(() => {
    const initClient = () => {
      const GAPI_READ_API_KEY = import.meta.env.VITE_GAPI_READ_API_KEY;
      if (!GAPI_READ_API_KEY) {
        console.error("VITE_GAPI_READ_API_KEY is not defined!");
        setError("前端讀取用的 API 金鑰未設定，無法顯示資料。");
        setLoading(false);
        return;
      }
      window.gapi.client
        .init({
          apiKey: GAPI_READ_API_KEY,
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        })
        .then(loadSheetDataForReading)
        .catch((err) => {
          console.error('Error initializing GAPI client', err);
          setError('無法初始化 Google API 用戶端。');
          setLoading(false);
        });
    };
    if (window.gapi) {
        window.gapi.load('client', initClient);
    } else {
        setError('Google API 用戶端程式庫載入失敗。請檢查您的網路連線和指令碼標籤。');
        setLoading(false);
    }
  }, [loadSheetDataForReading]);

  const handleItemTypeChange = (event) => {
    const selectedType = event.target.value;
    setItemType(selectedType);
    setItemName('');
    setItemTypeId('');
    const relevantGoods = goodsIdData.filter(item => item.type === selectedType);
    const uniqueNames = [...new Set(relevantGoods.map(item => item.name))];
    setItemNameOptions(uniqueNames);
  };

  const handleItemNameChange = (event) => {
    const selectedName = event.target.value;
    setItemName(selectedName);
    const selectedGood = goodsIdData.find(item => item.type === itemType && item.name === selectedName);
    if (selectedGood) {
        setItemTypeId(selectedGood.id);
    }
  };

  const handleItemTypeFilterChange = (event) => {
      const selectedType = event.target.value;
      setItemTypeFilter(selectedType);
      setItemNameFilter(''); // Reset item name filter
      if (selectedType) {
          const relevantGoods = goodsIdData.filter(item => item.type === selectedType);
          const uniqueNames = [...new Set(relevantGoods.map(item => item.name))];
          setItemNameFilterOptions(uniqueNames);
      } else {
          setItemNameFilterOptions([]);
      }
  };

  const handleItemNameFilterChange = (event) => {
      setItemNameFilter(event.target.value);
  };
  
  const allFilteredData = inventoryData.filter(item => {
    return (
      (itemTypeFilter ? item.itemType === itemTypeFilter : true) &&
      (itemNameFilter ? item.itemName === itemNameFilter : true)
      // 👈 不加數量限制，包含 0
    );
  });
  
  const getLowestPrice = () => {
    if (!itemNameFilter) return null;
    const prices = allFilteredData
      .map(item => parseFloat(item.unitPrice))
      .filter(price => !isNaN(price));   // 過濾掉 NaN
    return prices.length > 0 ? Math.min(...prices) : null;
  };
  const getLowestPriceLocation = () => {
    if (!itemNameFilter) return null;
    const pricesWithLocation = allFilteredData.map(item => ({
      price: parseFloat(item.unitPrice),
      location: item.purchaseLocation || 'N/A'
    }));
    if (pricesWithLocation.length === 0) return null;
  
    const minItem = pricesWithLocation.reduce((prev, curr) =>
      curr.price < prev.price ? curr : prev
    );
    return minItem.location;
  };


  const handleTodayClick = (setter) => () => {
    setter(dayjs());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!itemTypeId || !itemType || !itemName) {
      setFormError('所有欄位都必須填寫。');
      return;
    }
    if (quantity <= 0) {
        setFormError('數量必須是大於 0 的數字。');
        return;
    }

    const finalUnitPrice = parseFloat(unitPrice);
    if (isNaN(finalUnitPrice) || finalUnitPrice < 0) {
        setFormError('請輸入有效的單價（不可為負數）。');
        return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const formattedPurchaseDate = purchaseDate ? dayjs(purchaseDate).format('DD-MM-YYYY') : '';
    const formattedExpirationDate = expirationDate ? dayjs(expirationDate).format('DD-MM-YYYY') : '';
    const newRow = [nextId, itemTypeId, itemType, itemName, quantity, finalUnitPrice, purchaseLocation,  formattedPurchaseDate, formattedExpirationDate];

    try {
        const response = await fetch('/api/add-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newRow }),
        });
   
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(response.statusText || '從伺服器返回了一個未知的錯誤');
            }
            throw new Error(errorData.message || '從伺服器返回了一個錯誤');
        }

     const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '後端返回了一個失敗的回應。');
        }

              // ✅ 成功後直接寫入 ActionLog
              const logRes = await fetch("/api/log-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "新增物品",
                  itemTypeId,
                  itemName,
                  quantity,
                  newQuantity: quantity,
                }),
              });

              const logResult = await logRes.json();
              if (!logResult.success) {
                console.error("❌ ActionLog failed:", logResult.message);
              } else {
                console.log("✅ Action logged:", logResult);
              }

        setIsSubmitting(false);
        setItemTypeId('');
        setItemType('');
        setItemName('');
        setQuantity(1);
        setUnitPrice('0');
        setPurchaseLocation('');
        setPurchaseDate(null);
        setExpirationDate(null);
        setItemNameOptions([]);
        setTimeout(() => loadSheetDataForReading(), 500);

    } catch (error) {
        setIsSubmitting(false);
        console.error('Error adding data:', error);
        setFormError(`無法新增物品：${error.message}`);
    }
  };
// 扣減 / 增加
const handleConsumption = async (operation) => {
  if (!consumptionItemId) {
    setConsumptionError('請選擇要消耗的物品 ID。');
    return;
  }

  const itemToUpdate = inventoryData.find(item => item.id === consumptionItemId);
  if (!itemToUpdate) {
    setConsumptionError('找不到對應的物品。');
    return;
  }

  const currentQuantity = parseInt(itemToUpdate.quantity, 10);
  const changeQuantity = parseInt(consumptionQuantity, 10);

  if (isNaN(changeQuantity) || changeQuantity <= 0) {
    setConsumptionError('消耗數量必須是大於 0 的數字。');
    return;
  }

  let newQuantity = operation === 'add'
    ? currentQuantity + changeQuantity
    : currentQuantity - changeQuantity;

  if (newQuantity < 0) {
    setConsumptionError('消耗後的數量不可為負數。');
    return;
  }

  setIsConsuming(true);
  setConsumptionError(null);

  try {
    // --- 呼叫 update-data ---
    const response = await fetch('/api/update-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: consumptionItemId, newQuantity }),
    });

    const raw = await response.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error(raw || response.statusText || '從伺服器返回了一個未知的錯誤');
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || '後端返回了一個錯誤');
    }

    // --- 成功後寫入 ActionLog ---
    try {
      const logRes = await fetch("/api/log-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: operation === "add" ? "新增(消耗)" : "扣減(消耗)",
          itemTypeId: itemToUpdate.itemTypeId,
          itemName: itemToUpdate.itemName,
          quantity: changeQuantity,
          newQuantity,
        }),
      });

      const rawLog = await logRes.text();
      let logResult;
      try {
        logResult = JSON.parse(rawLog);
      } catch {
        console.error("❌ ActionLog returned non-JSON:", rawLog);
        logResult = { success: false, message: rawLog };
      }

      if (!logResult.success) {
        console.error("❌ ActionLog failed:", logResult.message);
      } else {
        console.log("✅ Action logged:", logResult);
      }
    } catch (logError) {
      console.error("❌ ActionLog error:", logError);
    }

    // ✅ 成功後重置所有選擇
    setIsConsuming(false);
    setConsumptionItemType('');
    setConsumptionItemName('');
    setConsumptionItemId('');
    setConsumptionQuantity(1);

    setTimeout(() => loadSheetDataForReading(), 500);

  } catch (error) {
    setIsConsuming(false);
    console.error('Error updating data:', error);
    setConsumptionError(`無法更新數量：${error.message}`);
  }
};



  const filteredInventoryData = inventoryData.filter(item => {
    return (
        (itemTypeFilter ? item.itemType === itemTypeFilter : true) &&
        (itemNameFilter ? item.itemName === itemNameFilter : true) &&
        parseInt(item.quantity, 10) > 0   // 👈 新增這行，隱藏數量為 0
    );
  });

  const totalQuantity = filteredInventoryData.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
     {showToBuyList ? (
      // 👉 顯示 ToBuyList 頁面
      <ToBuyList onBack={() => setShowToBuyList(false)} />
    ) : (
      // 👉 顯示原本的 HomePage 畫面
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
            
                {/* 標題上方右方的按鈕 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  {/* 最左邊 Logo */}
                  <Avatar src="/favicon.png" alt="Logo" variant="square" sx={{ width: 40, height: 40 }} />

                  {/* 最右邊 按鈕群組 */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowSimplifiedInventory(!showSimplifiedInventory)}
                  >
                    {showSimplifiedInventory ? "完整庫存" : "簡化庫存"}
                  </Button>

                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setShowToBuyList(true)} // 切換 ToBuyList
                    >
                      待買清單
                    </Button>
                  </Box>
                </Box>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                新增物品
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ my: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="ID" fullWidth value={nextId} disabled />
                        <TextField label="物品種類ID" fullWidth value={itemTypeId} disabled />
                    </Box>
                    <FormControl fullWidth required>
                        <InputLabel id="item-type-label">物品種類</InputLabel>
                        <Select
                            labelId="item-type-label"
                            value={itemType}
                            label="物品種類"
                            onChange={handleItemTypeChange}
                        >
                            {itemTypeOptions.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
                        <FormControl fullWidth required disabled={!itemType} sx={{ flex: 2 }}>
                            <InputLabel id="item-name-label">物品名稱</InputLabel>
                            <Select
  labelId="consumption-item-name-label"
  value={consumptionItemName}
  label="物品名稱"
  onChange={(e) => {
    setConsumptionItemName(e.target.value);
    const selected = inventoryData.find(
      item => item.itemType === consumptionItemType && item.itemName === e.target.value
    );
    if (selected) {
      setConsumptionItemId(selected.id);   // ✅ 設定物品 ID
    }
  }}
>
  {inventoryData
    .filter(item => item.itemType === consumptionItemType && parseInt(item.quantity, 10) > 0)
    .map((item) => (
      <MenuItem key={item.id} value={item.itemName}>
        {formatId(item.id)} - {item.itemName} [現有庫存: {item.quantity}]
      </MenuItem>
    ))}
</Select>

                        </FormControl>
                        <Autocomplete
                            value={quantity.toString()}
                            onChange={(event, newValue) => {
                                setQuantity(parseInt(newValue, 10) || 1);
                            }}
                            onInputChange={(event, newInputValue) => {
                                const newQuantity = parseInt(newInputValue, 10);
                                if (!isNaN(newQuantity) && newQuantity > 0) {
                                    setQuantity(newQuantity);
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
                    </Box>
                        {/* 單價 + 購買地點 */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            label="單價"
                            type="number"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                            required
                            InputProps={{
                              inputProps: { min: 0, step: "0.1" },
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            sx={{ flex: 1 }}
                          />

                          <FormControl fullWidth required sx={{ flex: 1 }}>
                              <InputLabel id="purchase-location-label">購買地點</InputLabel>
                              <Select
                                labelId="purchase-location-label"
                                value={purchaseLocation}
                                label="購買地點"
                                onChange={(e) => setPurchaseLocation(e.target.value)}
                              >
                                {locationOptions.map((loc, idx) => (
                                  <MenuItem key={idx} value={loc}>{loc}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                        </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <DatePicker
                            label="購買日期"
                            value={purchaseDate}
                            onChange={(newValue) => setPurchaseDate(newValue)}
                            format="DD-MM-YYYY"
                            slots={{ calendarHeader: CustomCalendarHeader }}
                            slotProps={{
                                calendarHeader: { onTodayClick: handleTodayClick(setPurchaseDate) },
                                textField: { fullWidth: true },
                            }}
                        />
                        <DatePicker
                            label="到期日"
                            value={expirationDate}
                            onChange={(newValue) => setExpirationDate(newValue)}
                            format="DD-MM-YYYY"
                            slots={{ calendarHeader: CustomCalendarHeader }}
                            slotProps={{
                                calendarHeader: { onTodayClick: handleTodayClick(setExpirationDate) },
                                textField: { fullWidth: true },
                            }}
                        />
                    </Box>
                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} size="large">
                        {isSubmitting ? <CircularProgress size={24} /> : '確認新增'}
                    </Button>
                </Box>
                {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
                </Box>

                <Box sx={{ mt: 6 }}>
  <Typography variant="h4" component="h1" gutterBottom align="center">
    減掉消耗
  </Typography>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 3 }}>
  
  {/* 物品種類 + 數量並排 */}
  <Box sx={{ display: 'flex', gap: 2 }}>
    {/* 物品種類 */}
    <FormControl sx={{ flex: 1 }} required>
      <InputLabel id="consumption-item-type-label">物品種類</InputLabel>
      <Select
        labelId="consumption-item-type-label"
        value={consumptionItemType}
        label="物品種類"
        onChange={(e) => {
          setConsumptionItemType(e.target.value);
          setConsumptionItemName("");
          setConsumptionItemId("");
        }}
      >
        <MenuItem value=""><em>全部</em></MenuItem>
        {[...new Set(inventoryData.map(item => item.itemType))].map((type) => (
          <MenuItem key={type} value={type}>{type}</MenuItem>
        ))}
      </Select>
    </FormControl>

    {/* 數量選擇 */}
    <Box sx={{ flex: 1 }}>
      <Autocomplete
        freeSolo                 // ✅ 允許自由輸入
        disablePortal
        options={[...Array(10)].map((_, i) => (i + 1).toString())} // 1–10 選項
        value={consumptionQuantity?.toString() || ""}
        onChange={(e, newValue) => setConsumptionQuantity(newValue)}
        onInputChange={(e, newInputValue) => setConsumptionQuantity(newInputValue)}
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
    </Box>
  </Box>


    {/* 物品名稱獨立一行 */}
    <FormControl fullWidth required disabled={!consumptionItemType}>
      <InputLabel id="consumption-item-name-label">物品名稱</InputLabel>
      <Select
        labelId="consumption-item-name-label"
        value={consumptionItemName}
        label="物品名稱"
        onChange={(e) => {
          setConsumptionItemName(e.target.value);
          const selected = inventoryData.find(
            item => item.itemType === consumptionItemType && item.itemName === e.target.value
          );
          if (selected) setConsumptionItemId(selected.id);
        }}
      >
        <MenuItem value=""><em>全部</em></MenuItem>
        {inventoryData
          .filter(item => item.itemType === consumptionItemType && parseInt(item.quantity, 10) > 0)
          .map((item) => (
            <MenuItem key={item.id} value={item.itemName}>
              {formatId(item.id)} - {item.itemName} [現有庫存: {item.quantity}]
            </MenuItem>
          ))}
      </Select>
    </FormControl>


    {/* 按鈕 */}
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="contained"
        color="success"
        onClick={() => handleConsumption('add')}
        disabled={isConsuming}
        fullWidth
      >
        {isConsuming ? <CircularProgress size={24} /> : '增加'}
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={() => handleConsumption('subtract')}
        disabled={isConsuming}
        fullWidth
      >
        {isConsuming ? <CircularProgress size={24} /> : '扣減'}
      </Button>
    </Box>
  </Box>

  {consumptionError && <Alert severity="error" sx={{ mt: 2 }}>{consumptionError}</Alert>}
</Box>



                <Box sx={{ mt: 6 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">庫存總覽</Typography>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : (
                    <>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel id="item-type-filter-label">篩選物品種類</InputLabel>
                                <Select
                                    labelId="item-type-filter-label"
                                    value={itemTypeFilter}
                                    label="篩選物品種類"
                                    onChange={handleItemTypeFilterChange}
                                >
                                    <MenuItem value=""><em>全部</em></MenuItem>
                                    {itemTypeOptions.map(type => (
                                        <MenuItem key={type} value={type}>{type}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth disabled={!itemTypeFilter}>
                                <InputLabel id="item-name-filter-label">篩選物品名稱</InputLabel>
                                <Select
                                    labelId="item-name-filter-label"
                                    value={itemNameFilter}
                                    label="篩選物品名稱"
                                    onChange={handleItemNameFilterChange}
                                >
                                    <MenuItem value=""><em>全部</em></MenuItem>
                                    {itemNameFilterOptions.map(name => (
                                        <MenuItem key={name} value={name}>{name}</MenuItem>
                                    ))
                                    }
                                </Select>
                            </FormControl>
                        </Box>

                        {itemNameFilter && (
                        <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                        <Typography variant="h6" color="primary">
                        {itemNameFilter} 的最低價：${getLowestPrice() ?? 'N/A'}
                        {getLowestPriceLocation() ? ` （購買地點：${getLowestPriceLocation()}）` : ''}
                      </Typography>
                    </Box>
                  )}

                              {/* 完整庫存模式 */}
                              {!showSimplifiedInventory && (
                                <>
                                  <TableContainer component={Paper} variant="outlined">
                                    <Table aria-label="inventory table">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell align="center">ID</TableCell>
                                          <TableCell align="center">物品種類ID</TableCell>
                                          <TableCell align="center">物品種類</TableCell>
                                          <TableCell align="center">物品名稱</TableCell>
                                          <TableCell align="center">數量</TableCell>
                                          <TableCell align="center">單價</TableCell>
                                          <TableCell align="center">購買地點</TableCell>
                                          <TableCell align="center">購買日期</TableCell>
                                          <TableCell align="center">到期日</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {filteredInventoryData.length > 0 ? (
                                          filteredInventoryData.map((item, index) => (
                                            <TableRow key={`${item.id}-${index}`}>
                                              <TableCell align="center">{formatId(item.id)}</TableCell>
                                              <TableCell align="center">{item.itemTypeId}</TableCell>
                                              <TableCell align="center">{item.itemType}</TableCell>
                                              <TableCell align="center">{item.itemName}</TableCell>
                                              <TableCell align="center">{item.quantity}</TableCell>
                                              <TableCell align="center">${item.unitPrice}</TableCell>
                                              <TableCell align="center">{item.purchaseLocation || 'N/A'}</TableCell>
                                              <TableCell align="center">
                                                {item.purchaseDate && item.purchaseDate.isValid()
                                                  ? item.purchaseDate.format('DD-MM-YYYY')
                                                  : 'N/A'}
                                              </TableCell>
                                              <TableCell
                                                align="center"
                                                className={
                                                  item.expirationDate && item.expirationDate.isValid()
                                                    ? (item.expirationDate.isSame(dayjs(), 'day') ||
                                                        item.expirationDate.isBefore(dayjs(), 'day'))
                                                      ? 'expired'
                                                      : ''
                                                    : ''
                                                }
                                              >
                                                {item.expirationDate && item.expirationDate.isValid()
                                                  ? item.expirationDate.format('DD-MM-YYYY')
                                                  : 'N/A'}
                                              </TableCell>
                                            </TableRow>
                                          ))
                                        ) : (
                                          <TableRow>
                                            <TableCell colSpan={9} align="center">
                                              目前沒有任何物品符合篩選條件
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>

                                  <Box
                                    sx={{
                                      mt: 2,
                                      p: 2,
                                      border: '1px solid',
                                      borderColor: 'grey.300',
                                      borderRadius: 1,
                                      textAlign: 'right',
                                    }}
                                  >
                                    <Typography variant="h6">總數量: {totalQuantity}</Typography>
                                  </Box>
                                </>
                              )}

                              {/* 簡化庫存模式 */}
                              {showSimplifiedInventory && (
                                <Box sx={{ mt: 3 }}>
                                  <List>
                                    {filteredInventoryData.length > 0 ? (
                                      filteredInventoryData.map((item, index) => {
                                        // 判斷到期日樣式
                                        const getExpiryStyle = (expirationDate) => {
                                          if (!expirationDate || !expirationDate.isValid()) {
                                            return { color: "black" };
                                          }
                                          const today = dayjs();
                                          const diffDays = expirationDate.diff(today, "day");

                                          if (diffDays < 0) {
                                            return { color: "red", fontWeight: "bold" }; // 已過期
                                          }
                                          if (diffDays <= 7) {
                                            return { color: "orange" }; // 快到期
                                          }
                                          return { color: "black" }; // 正常
                                        };

                                        return (
                                          <ListItem key={`${item.id}-${index}`}>
                                            <ListItemText
                                              primary={
                                                <span style={getExpiryStyle(item.expirationDate)}>
                                                  {`${item.id} - ${item.itemName} (數量: ${item.quantity})`}
                                                </span>
                                              }
                                              secondary={
                                                <span style={getExpiryStyle(item.expirationDate)}>
                                                  單價: {item.unitPrice && Number(item.unitPrice) !== 0 ? `$${item.unitPrice}` : "$N/A"} |{" "}
                                                  購買地點: {item.purchaseLocation ? item.purchaseLocation : "N/A"} |{" "}
                                                  到期日:{" "}
                                                  {item.expirationDate && item.expirationDate.isValid()
                                                    ? item.expirationDate.format("DD-MM-YYYY")
                                                    : "N/A"}
                                                </span>
                                              }
                                            />
                                          </ListItem>
                                        );
                                      })
                                    ) : (
                                      <Typography align="center">目前沒有任何物品符合篩選條件</Typography>
                                    )}
                                  </List>
                                </Box>
                              )}

                    </>
                )}
                </Box>

                
            </Paper>
        </Container>
        </Box>
        )}
    </LocalizationProvider>
  );
}
export default HomePage;
