import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout';

function App() {
  const [darkMode, setDarkMode] = useState(true);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          background: {
            default: '#121212',
            paper: 'rgba(255,255,255,0.05)',
          },
          text: {
            primary: '#F2F2F2',
            secondary: '#A8ADA9',
          },
          success: { main: '#4CAF50' },
        },
        shape: { borderRadius: 8 },
        typography: { fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
        components: {
          MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
          MuiOutlinedInput: { styleOverrides: { root: { color: '#F2F2F2', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } } },
          MuiInputLabel: { styleOverrides: { root: { color: '#A8ADA9' } } },
          MuiMenu: { styleOverrides: { paper: { backgroundColor: '#1E1E1E', color: '#F2F2F2' } } },
        },
      }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}>
        <Routes>
          <Route path='/hlf-analytics/' element={<DashboardPage />} />
          <Route path='/hlf-analytics/admin/*' element={<AdminPage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default App;
