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
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import CustomCalendarHeader from '../components/CustomCalendarHeader';

dayjs.extend(customParseFormat);
dayjs.locale('zh-cn');

const SPREADSHEET_ID = '1onhaEhn7RftQFLYeZeL9uHfD0Ci8pN1d_GJRk4h5OyU';

const formatId = (num) => String(num).padStart(6, '0');

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
  const [unitPrice, setUnitPrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(null);
  const [expirationDate, setExpirationDate] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown options
  const [itemTypeOptions, setItemTypeOptions] = useState([]);
  const [itemNameOptions, setItemNameOptions] = useState([]);
  const [itemNameFilterOptions, setItemNameFilterOptions] = useState([]);

  // Filter state
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [itemNameFilter, setItemNameFilter] = useState('');

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
        ranges: ['HouseInventory!A2:H', 'GoodsID!A2:C'],
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
            purchaseDate: row[6] || null,
            expirationDate: row[7] || null,
          }));
          setInventoryData(formattedInventory);

          if (inventoryRows.length > 0) {
            const lastRow = inventoryRows[inventoryRows.length - 1];
            const lastId = parseInt(lastRow[0], 10);
            if (!isNaN(lastId)) {
              setNextId(formatId(lastId + 1));
            }
          }

          const goodsIdRows = response.result.valueRanges[1].values || [];
          const goodsData = goodsIdRows.map(row => ({ id: row[0], type: row[1], name: row[2] }));
          setGoodsIdData(goodsData);

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
    if (unitPrice < 0) {
        setFormError('單價不能是負數。');
        return;
    }
    setIsSubmitting(true);
    setFormError(null);

    const formattedPurchaseDate = purchaseDate ? dayjs(purchaseDate).format('DD-MM-YYYY') : '';
    const formattedExpirationDate = expirationDate ? dayjs(expirationDate).format('DD-MM-YYYY') : '';
    const newRow = [nextId, itemTypeId, itemType, itemName, quantity, unitPrice, formattedPurchaseDate, formattedExpirationDate];

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

        setIsSubmitting(false);
        setItemTypeId('');
        setItemType('');
        setItemName('');
        setQuantity(1);
        setUnitPrice(0);
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

  const filteredInventoryData = inventoryData.filter(item => {
    return (
        (itemTypeFilter ? item.itemType === itemTypeFilter : true) &&
        (itemNameFilter ? item.itemName === itemNameFilter : true)
    );
  });

  const totalQuantity = filteredInventoryData.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
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
                                labelId="item-name-label"
                                value={itemName}
                                label="物品名稱"
                                onChange={handleItemNameChange}
                            >
                                {itemNameOptions.map(name => (
                                    <MenuItem key={name} value={name}>{name}</MenuItem>
                                ))
                                }
                            </Select>
                        </FormControl>
                        <TextField
                            label="數量"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                            required
                            InputProps={{
                                inputProps: { min: 1 },
                            }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="單價"
                            type="number"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                            required
                            InputProps={{
                                inputProps: { min: 0, step: "0.1" },
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            sx={{ flex: 1 }}
                        />
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
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
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
                                    <TableCell align="center">{(item.purchaseDate && item.purchaseDate.trim()) ? dayjs(item.purchaseDate, 'DD-MM-YYYY').format('DD-MM-YYYY') : 'N/A'}</TableCell>
                                    <TableCell align="center">{(item.expirationDate && item.expirationDate.trim()) ? dayjs(item.expirationDate, 'DD-MM-YYYY').format('DD-MM-YYYY') : 'N/A'}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={8} align="center">目前沒有任何物品符合篩選條件</TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </TableContainer>
                        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, textAlign: 'right' }}>
                            <Typography variant="h6">
                                總數量: {totalQuantity}
                            </Typography>
                        </Box>
                    </>
                )}
                </Box>
            </Paper>
        </Container>
        </Box>
    </LocalizationProvider>
  );
}
export default HomePage;
