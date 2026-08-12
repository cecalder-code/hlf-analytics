import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function DashboardPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant='h4' gutterBottom>Public Dashboard</Typography>
        <Typography>Metrics, filters, and public charts will appear here.</Typography>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant='h6'>Key performance indicators</Typography>
      </Paper>
    </Box>
  );
}
