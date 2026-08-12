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
        },
      }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}>
        <Routes>
          <Route path='/' element={<DashboardPage />} />
          <Route path='/admin/*' element={<AdminPage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default App;
