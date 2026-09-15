import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Switch from '@mui/material/Switch';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ReactNode, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export default function Layout({ children, darkMode, onToggleTheme }: LayoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position='sticky'>
        <Toolbar>
          <IconButton edge='start' color='inherit' onClick={() => setOpen((value) => !value)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant='h6' sx={{ flexGrow: 1 }}>
            Coffee Diversion Dashboard
          </Typography>
          <Switch checked={darkMode} onChange={onToggleTheme} color='default' />
        </Toolbar>
      </AppBar>
      <Container component='main' sx={{ py: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Link component={RouterLink} to='/hlf-analytics/' underline='hover'>Public Dashboard</Link>
          <Link component={RouterLink} to='/hlf-analytics/admin' underline='hover'>Admin Portal</Link>
        </Box>
        {children}
      </Container>
    </Box>
  );
}
