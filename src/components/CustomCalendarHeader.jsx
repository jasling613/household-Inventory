
import React from 'react';
import { Button, Box } from '@mui/material';
import { PickersCalendarHeader } from '@mui/x-date-pickers/PickersCalendarHeader';

const CustomCalendarHeader = (props) => {
  // 將 onTodayClick 從 props 中解構出來，這樣 ...other 就不會包含它
  const { onTodayClick, ...other } = props;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* 將剩餘的 other 屬性傳遞給 PickersCalendarHeader */}
      <PickersCalendarHeader {...other} />
      <Box sx={{ position: 'absolute', right: '90px', top: '12px' }}>
        <Button
          size="small"
          onClick={onTodayClick}
        >
          今天
        </Button>
      </Box>
    </Box>
  );
};

export default CustomCalendarHeader;
