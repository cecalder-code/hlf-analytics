import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function AdminPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>Admin Data Entry Portal</Typography>
        <Typography>Secure data entry, store management, and pickup log administration.</Typography>
      </Paper>
    </Box>
  );
}
