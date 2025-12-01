
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <BrowserRouter>
        <Box sx={{ width: '100vw', height: '100vh' }}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
        </Box>
    </BrowserRouter>
  );
}

export default App;
