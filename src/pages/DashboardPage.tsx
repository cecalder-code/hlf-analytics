import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import Co2OutlinedIcon from '@mui/icons-material/Co2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import RecyclingOutlinedIcon from '@mui/icons-material/RecyclingOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { loadExcelData, type ExcelRecord } from '../data/loadExcel';

const colors = { background: '#121212', text: '#F2F2F2', muted: '#A8ADA9', green: '#4CAF50', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };

type DashboardRecord = ExcelRecord & {
  Date: Date | null;
  Net_lbs: number;
  CO2e_lbs: number;
  MilesDriven: number;
  DaysBetweenCollections: number;
  StoreNumber: string;
  StoreShortened: string;
  RubiconPeriod: 'Rubicon Hauling' | 'Pre-Rubicon';
  YearWeek: string;
  DailySCG: number;
  MethaneAvoided: number;
  CardboardLbs: number;
  MasterGardener: number;
  TransportationCO2e: number;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value: unknown): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStoreNumber = (store: unknown): string => {
  const value = String(store ?? '').trim();
  if (!value) return 'Unknown';
  if (value.includes('Stanton')) return '8962';
  if (value.includes('Red Banks')) return '8582';
  if (value.includes('100 East 10th Street')) return '13481';
  if (value.includes('Winterville')) return '27296';
  return value;
};

const getStoreShortened = (store: unknown): string => {
  const value = String(store ?? '').trim();
  if (!value) return 'Unknown';
  if (value.includes('Stanton')) return 'Stanton';
  if (value.includes('Red Banks')) return 'Red Banks';
  if (value.includes('100 East 10th Street')) return '10th St';
  if (value.includes('Winterville')) return 'Winterville';
  return value;
};

const formatNumber = (value: number, digits = 0) => value.toLocaleString(undefined, { maximumFractionDigits: digits });
const formatDate = (date: Date | null) => date ? date.toLocaleDateString() : 'Unknown';
const isoDate = (date: Date | null) => date ? date.toISOString().slice(0, 10) : '';
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
type MonthlyRow = { month: string; total: number; [year: string]: string | number };
const stdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
};

const deriveRows = (records: ExcelRecord[]): DashboardRecord[] => records.map((row) => {
  const date = normalizeDate(row.Date);
  const netLbs = toNumber(row['Net lbs']);
  const co2eLbs = toNumber(row['CO2e (lbs)']) || netLbs * 0.154;
  const milesDriven = toNumber(row['Miles Driven']);
  const daysBetweenCollections = toNumber(row['# of Days between collections']);
  const weekNumber = toNumber(row['Week #']);
  const storeNumber = getStoreNumber(row.Store);
  const storeShortened = getStoreShortened(row.Store);
  return { ...row, Date: date, Net_lbs: netLbs, CO2e_lbs: co2eLbs, MilesDriven: milesDriven, DaysBetweenCollections: daysBetweenCollections, StoreNumber: storeNumber, StoreShortened: storeShortened, RubiconPeriod: date && date > new Date('2026-01-06T00:00:00') ? 'Rubicon Hauling' : 'Pre-Rubicon', YearWeek: `${date?.getFullYear() ?? 'Unknown'} ${weekNumber}`, DailySCG: daysBetweenCollections ? netLbs / daysBetweenCollections : 0, MethaneAvoided: co2eLbs / 28, CardboardLbs: toNumber(row['Cardboard (lbs)']), MasterGardener: toNumber(row['Master Gardener']), TransportationCO2e: milesDriven * 0.89 };
});

const panelSx = { p: { xs: 2, md: 2.5 }, bgcolor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' };
const tableCellSx = { color: colors.text, borderColor: colors.border, whiteSpace: 'nowrap' };
const tooltipStyle = { backgroundColor: '#242424', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 1 };

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof RecyclingOutlinedIcon }) {
  return <Paper sx={{ ...panelSx, minHeight: 112 }}><Stack direction='row' justifyContent='space-between' alignItems='flex-start'><Typography className='tableau-label'>{label}</Typography>{Icon && <Icon sx={{ color: colors.green, fontSize: 21 }} />}</Stack><Typography sx={{ mt: 1, color: colors.text, fontSize: { xs: 25, md: 29 }, fontWeight: 800 }}>{value}</Typography></Paper>;
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return <Box sx={{ mb: 2 }}><Typography variant='h6' sx={{ color: colors.text, fontWeight: 800 }}>{title}</Typography>{detail && <Typography sx={{ color: colors.muted, fontSize: 13, mt: 0.4 }}>{detail}</Typography>}</Box>;
}

export default function DashboardPage() {
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [period, setPeriod] = useState('All periods');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<'Date' | 'Net_lbs' | 'StoreNumber'>('Date');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => { let active = true; void loadExcelData().then((data) => { if (active) { setRecords(deriveRows(data)); setLastUpdated(new Date()); setIsLoading(false); } }); return () => { active = false; }; }, []);

  const storeOptions = useMemo(() => [...new Set(records.map((row) => row.StoreNumber))].sort(), [records]);
  const filteredRows = useMemo(() => records.filter((row) => { const date = isoDate(row.Date); return (!selectedStores.length || selectedStores.includes(row.StoreNumber)) && (period === 'All periods' || row.RubiconPeriod === period) && (!startDate || date >= startDate) && (!endDate || date <= endDate); }), [records, selectedStores, period, startDate, endDate]);
  const weeklyData = useMemo(() => { let runningTotal = 0; return Object.values(filteredRows.reduce<Record<string, { date: Date | null; week: string; netLbs: number }>>((acc, row) => { const key = isoDate(row.Date) || row.YearWeek; const current = acc[key] ?? { date: row.Date, week: row.YearWeek, netLbs: 0 }; current.netLbs += row.Net_lbs; acc[key] = current; return acc; }, {})).sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)).map((row) => { runningTotal += row.netLbs; return { ...row, dateLabel: formatDate(row.date), runningTotal }; }); }, [filteredRows]);
  const storeData = useMemo(() => Object.values(filteredRows.reduce<Record<string, { store: string; storeNumber: string; pounds: number }>>((acc, row) => { const current = acc[row.StoreNumber] ?? { store: row.StoreShortened, storeNumber: row.StoreNumber, pounds: 0 }; current.pounds += row.Net_lbs; acc[row.StoreNumber] = current; return acc; }, {})).sort((a, b) => b.pounds - a.pounds), [filteredRows]);
  const totalDiverted = filteredRows.reduce((sum, row) => sum + row.Net_lbs, 0);
  const totalCo2e = filteredRows.reduce((sum, row) => sum + row.CO2e_lbs, 0);
  const weeklyCount = new Set(filteredRows.map((row) => row.YearWeek)).size;
  const totalMiles = filteredRows.reduce((sum, row) => sum + row.MilesDriven, 0);
  const totalTransportation = filteredRows.reduce((sum, row) => sum + row.TransportationCO2e, 0);
  const metrics = { totalDiverted, avgWeekly: weeklyCount ? totalDiverted / weeklyCount : 0, donated: filteredRows.reduce((sum, row) => sum + row.MasterGardener, 0), collections: filteredRows.length, co2e: totalCo2e, methane: filteredRows.reduce((sum, row) => sum + row.MethaneAvoided, 0) };
  const operations = [['Avg Days Between Collections', formatNumber(mean(filteredRows.map((row) => row.DaysBetweenCollections)), 1)], ['Pickup Interval Variance', formatNumber(stdDev(filteredRows.map((row) => row.DaysBetweenCollections)), 1)], ['Miles Driven', formatNumber(totalMiles, 1)], ['CO2e Generated from Driving', `${formatNumber(totalTransportation, 1)} lbs`], ['SCG per Mile Driven', formatNumber(totalMiles ? totalDiverted / totalMiles : 0, 1)], ['CO2e Avoided per Mile', formatNumber(totalMiles ? totalCo2e / totalMiles : 0, 1)]];
  const monthlyData = useMemo<MonthlyRow[]>(() => { const rows = new Map<string, Record<string, number>>(); filteredRows.forEach((row) => { if (!row.Date) return; const month = row.Date.toLocaleString(undefined, { month: 'short' }); const current = rows.get(month) ?? { '2023': 0, '2024': 0, '2025': 0, '2026': 0 }; const year = String(row.Date.getFullYear()); if (year in current) current[year] += row.Net_lbs; rows.set(month, current); }); return [...rows.entries()].map(([month, values]) => ({ month, ...values, total: Object.values(values).reduce((sum, value) => sum + value, 0) })); }, [filteredRows]);
  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => { const left = sortKey === 'Date' ? a.Date?.getTime() ?? 0 : sortKey === 'Net_lbs' ? a.Net_lbs : a.StoreNumber; const right = sortKey === 'Date' ? b.Date?.getTime() ?? 0 : sortKey === 'Net_lbs' ? b.Net_lbs : b.StoreNumber; return (left < right ? -1 : left > right ? 1 : 0) * (sortAsc ? 1 : -1); }), [filteredRows, sortKey, sortAsc]);
  const visibleRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const pickupColumns: GridColDef[] = [
    { field: 'week', headerName: 'Week', flex: 1, minWidth: 100 },
    { field: 'date', headerName: 'Date', flex: 1, minWidth: 110 },
    { field: 'storeNumber', headerName: 'Store Number', flex: 1, minWidth: 120 },
    { field: 'storeName', headerName: 'Store Name', flex: 1.2, minWidth: 130 },
    { field: 'netLbs', headerName: 'Net lbs', flex: 1, minWidth: 100, type: 'number' },
    { field: 'perDayLbs', headerName: 'Per Day lbs', flex: 1, minWidth: 110, type: 'number' },
    { field: 'co2eDiverted', headerName: 'CO2e Diverted', flex: 1, minWidth: 125, type: 'number' },
    { field: 'cardboardLbs', headerName: 'Cardboard lbs', flex: 1, minWidth: 120, type: 'number' },
  ];
  const pickupRows = visibleRows.map((row, index) => ({
    id: `${row.StoreNumber}-${isoDate(row.Date)}-${index}`,
    week: row.YearWeek,
    date: formatDate(row.Date),
    storeNumber: row.StoreNumber,
    storeName: row.StoreShortened,
    netLbs: Number(row.Net_lbs.toFixed(1)),
    perDayLbs: Number(row.DailySCG.toFixed(1)),
    co2eDiverted: Number(row.CO2e_lbs.toFixed(1)),
    cardboardLbs: Number(row.CardboardLbs.toFixed(1)),
  }));
  const setSort = (key: 'Date' | 'Net_lbs' | 'StoreNumber') => { setSortAsc(sortKey === key ? !sortAsc : false); setSortKey(key); };
  const handleStoreChange = (event: SelectChangeEvent<string[]>) => setSelectedStores(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value);
  const resetFilters = () => { setSelectedStores([]); setPeriod('All periods'); setStartDate(''); setEndDate(''); setPage(0); };
  const kpis = [['Total SCG Diverted', `${formatNumber(metrics.totalDiverted)} lbs`, RecyclingOutlinedIcon], ['AVG Weekly SCG', `${formatNumber(metrics.avgWeekly)} lbs`, AssessmentOutlinedIcon], ['Donated to Arboretum', `${formatNumber(metrics.donated)} lbs`, RecyclingOutlinedIcon], ['No. of Collections', formatNumber(metrics.collections), LocalShippingOutlinedIcon], ['Total CO2e Diverted', `${formatNumber(metrics.co2e)} lbs`, Co2OutlinedIcon], ['Methane Diverted', `${formatNumber(metrics.methane)} lbs`, Co2OutlinedIcon]] as const;

  return <Box sx={{ display: 'grid', gap: 2.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}><Box><Typography className='tableau-label' sx={{ color: colors.green }}>HLF SCG REPORTING</Typography><Typography variant='h4' sx={{ mt: .5, color: colors.text, fontWeight: 800 }}>Coffee Diversion Dashboard</Typography><Typography sx={{ color: colors.muted, mt: .5 }}>Last Updated on {lastUpdated?.toLocaleString() ?? 'Loading...'}</Typography></Box><Chip label={isLoading ? 'Loading Excel data...' : `${filteredRows.length} pickups`} sx={{ bgcolor: 'rgba(76,175,80,.16)', color: '#8be28f', fontWeight: 700 }} /></Box>
    <Paper sx={{ ...panelSx, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}><FormControl size='small' sx={{ minWidth: 220 }}><InputLabel>Store</InputLabel><Select multiple value={selectedStores} onChange={handleStoreChange} input={<OutlinedInput label='Store' />} renderValue={(selected) => selected.join(', ')}>{storeOptions.map((store) => <MenuItem key={store} value={store}><Checkbox checked={selectedStores.includes(store)} /><ListItemText primary={store} /></MenuItem>)}</Select></FormControl><FormControl size='small' sx={{ minWidth: 170 }}><InputLabel>Rubicon period</InputLabel><Select value={period} label='Rubicon period' onChange={(event) => setPeriod(event.target.value)}><MenuItem value='All periods'>All periods</MenuItem><MenuItem value='Pre-Rubicon'>Pre-Rubicon</MenuItem><MenuItem value='Rubicon Hauling'>Rubicon Hauling</MenuItem></Select></FormControl><TextField size='small' label='Start date' type='date' value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} /><TextField size='small' label='End date' type='date' value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} /><Button onClick={resetFilters} startIcon={<RestartAltOutlinedIcon />} sx={{ color: colors.green }}>Reset</Button></Paper>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>{kpis.map(([label, value, icon]) => <MetricCard key={label} label={label} value={isLoading ? '—' : value} icon={icon} />)}</Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(300px, 1fr)' }, gap: 2 }}><Paper sx={panelSx}><SectionTitle title='Running Total' detail='Cumulative SCG diverted over time' /><Box sx={{ height: 320 }}>{!isLoading && <ResponsiveContainer><LineChart data={weeklyData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid stroke={colors.border} vertical={false} /><XAxis dataKey='dateLabel' tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${formatNumber(Number(value))} lbs`, name === 'runningTotal' ? 'Running total' : 'Net lbs for week']} /><Line type='monotone' dataKey='runningTotal' stroke={colors.green} strokeWidth={3} dot={false} activeDot={{ r: 5 }} /><Line type='monotone' dataKey='netLbs' stroke='transparent' dot={false} /></LineChart></ResponsiveContainer>}</Box></Paper><Paper sx={panelSx}><SectionTitle title='Store Performance' detail='Click a bar to filter the dashboard' /><Box sx={{ height: 320 }}>{!isLoading && <ResponsiveContainer><BarChart data={storeData} layout='vertical' margin={{ top: 4, right: 12, left: 8, bottom: 4 }} onClick={(state) => { const store = state?.activePayload?.[0]?.payload?.storeNumber; if (store) setSelectedStores([store]); }}><CartesianGrid stroke={colors.border} horizontal={false} /><XAxis type='number' tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis type='category' dataKey='store' width={76} tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${formatNumber(Number(value))} lbs`, 'Total SCG']} /><Bar dataKey='pounds' fill={colors.green} radius={[0, 4, 4, 0]} barSize={22} /></BarChart></ResponsiveContainer>}</Box></Paper></Box>
    <Paper sx={panelSx}><SectionTitle title='Operations Details' /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1.5 }}>{operations.map(([label, value]) => <Box key={label} sx={{ p: 1.5, border: `1px solid ${colors.border}`, borderRadius: 1 }}><Typography className='tableau-label'>{label}</Typography><Typography sx={{ mt: .8, color: colors.text, fontWeight: 800 }}>{isLoading ? '—' : value}</Typography></Box>)}</Box></Paper>
    <Paper sx={panelSx}><SectionTitle title='Store Performance Summary' /><TableContainer><Table size='small'><TableHead><TableRow><TableCell sx={tableCellSx}>Store Number</TableCell><TableCell sx={tableCellSx}>Store Name</TableCell><TableCell align='right' sx={tableCellSx}>Total SCG Diverted</TableCell></TableRow></TableHead><TableBody>{storeData.map((row) => <TableRow key={row.storeNumber} hover><TableCell sx={tableCellSx}>{row.storeNumber}</TableCell><TableCell sx={tableCellSx}>{row.store}</TableCell><TableCell align='right' sx={tableCellSx}>{formatNumber(row.pounds)} lbs</TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>
    <Paper sx={panelSx}><SectionTitle title='Store Performance Details' /><TableContainer><Table size='small'><TableHead><TableRow>{['Store', 'Daily SCG', 'No. of Collections', 'Avg Weekly SCG', 'Max Single Collection', 'CO2e Diverted'].map((label) => <TableCell key={label} align={label === 'Store' ? 'left' : 'right'} sx={tableCellSx}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{storeData.map((store) => { const rows = filteredRows.filter((row) => row.StoreNumber === store.storeNumber); const total = rows.reduce((sum, row) => sum + row.Net_lbs, 0); return <TableRow key={store.storeNumber}><TableCell sx={tableCellSx}>{store.storeNumber} {store.store}</TableCell><TableCell align='right' sx={tableCellSx}>{formatNumber(mean(rows.map((row) => row.DailySCG)), 1)}</TableCell><TableCell align='right' sx={tableCellSx}>{rows.length}</TableCell><TableCell align='right' sx={tableCellSx}>{formatNumber(total / Math.max(new Set(rows.map((row) => row.YearWeek)).size, 1))}</TableCell><TableCell align='right' sx={tableCellSx}>{formatNumber(Math.max(...rows.map((row) => row.Net_lbs), 0))}</TableCell><TableCell align='right' sx={tableCellSx}>{formatNumber(rows.reduce((sum, row) => sum + row.CO2e_lbs, 0))}</TableCell></TableRow>; })}</TableBody></Table></TableContainer></Paper>
    <Paper sx={panelSx}><SectionTitle title='Monthly / Yearly Diversion' detail='SCG diverted by month and year' /><TableContainer><Table size='small'><TableHead><TableRow>{['Month', '2023', '2024', '2025', '2026', 'Grand Total'].map((label) => <TableCell key={label} align={label === 'Month' ? 'left' : 'right'} sx={{ ...tableCellSx, fontWeight: 800 }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{monthlyData.map((row, index) => <TableRow key={row.month} sx={{ bgcolor: index % 2 ? 'rgba(255,255,255,0.025)' : 'transparent' }}><TableCell sx={tableCellSx}>{row.month}</TableCell>{['2023', '2024', '2025', '2026'].map((year) => <TableCell key={year} align='right' sx={tableCellSx}>{formatNumber(Number(row[year] ?? 0))}</TableCell>)}<TableCell align='right' sx={{ ...tableCellSx, fontWeight: 800 }}>{formatNumber(row.total)}</TableCell></TableRow>)}<TableRow sx={{ bgcolor: 'rgba(76,175,80,.12)' }}><TableCell sx={{ ...tableCellSx, fontWeight: 800 }}>Grand Total</TableCell>{['2023', '2024', '2025', '2026'].map((year) => <TableCell key={year} align='right' sx={{ ...tableCellSx, fontWeight: 800 }}>{formatNumber(monthlyData.reduce((sum, row) => sum + Number(row[year] ?? 0), 0))}</TableCell>)}<TableCell align='right' sx={{ ...tableCellSx, fontWeight: 800 }}>{formatNumber(totalDiverted)}</TableCell></TableRow></TableBody></Table></TableContainer></Paper>
    <Paper sx={panelSx}><SectionTitle title='Pickup Log' detail='Sortable, paginated collection records' /><Box sx={{ height: 560, width: '100%' }}><DataGrid rows={pickupRows} columns={pickupColumns} paginationModel={{ page, pageSize: rowsPerPage }} onPaginationModelChange={(model) => { setPage(model.page); setRowsPerPage(model.pageSize); }} pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick sx={{ border: `1px solid ${colors.border}`, color: colors.text, '& .MuiDataGrid-columnHeaders': { bgcolor: '#242424', color: colors.text, borderColor: colors.border }, '& .MuiDataGrid-cell': { borderColor: colors.border }, '& .MuiTablePagination-root': { color: colors.muted }, '& .MuiDataGrid-footerContainer': { borderColor: colors.border } }} /></Box></Paper>
  </Box>;
}