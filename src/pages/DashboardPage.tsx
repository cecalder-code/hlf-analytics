import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import Co2OutlinedIcon from '@mui/icons-material/Co2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import RecyclingOutlinedIcon from '@mui/icons-material/RecyclingOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { loadExcelData, type ExcelRecord } from '../data/loadExcel';

const tooltipStyle = {
  border: '1px solid #dfe5e1',
  borderRadius: 8,
  backgroundColor: '#fffdf9',
  boxShadow: '0 8px 24px rgba(37, 55, 48, 0.12)',
};

type DashboardRecord = ExcelRecord & {
  Date: Date | null;
  Net_lbs: number;
  CO2e_lbs: number;
  MilesDriven: number;
  DaysBetweenCollections: number;
  DaysSinceFirstCollection: number;
  RubiconPeriod: 'Rubicon Hauling' | 'Pre-Rubicon';
  StoreNumber: string;
  StoreShortened: string;
  StoreNumberAndName: string;
  YearWeek: string;
  CO2eAvoidedPerMile: number;
  DailySCG: number;
  MethaneAvoided: number;
  SCGlbsPerMile: number;
  TransportationCO2e: number;
  WindowMax: 'Max' | 'Other';
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

const computeStdDev = (values: number[]): number => {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const deriveDashboardRows = (records: ExcelRecord[]): DashboardRecord[] => {
  if (!records.length) {
    return [];
  }

  const maxNetValue = records.reduce((sum, row) => Math.max(sum, toNumber(row['Net lbs'])), 0);

  return records.map((row) => {
    const date = normalizeDate(row.Date);
    const netLbs = toNumber(row['Net lbs']);
    const co2eLbs = toNumber(row['CO2e (lbs)']);
    const milesDriven = toNumber(row['Miles Driven']);
    const daysBetweenCollections = toNumber(row['# of Days between collections']);
    const daysSinceFirstCollection = toNumber(row['Days Since 1st Collection']);
    const weekNumber = toNumber(row['Week #']);
    const storeNumber = getStoreNumber(row.Store);
    const storeShortened = getStoreShortened(row.Store);
    const yearWeek = `${date ? date.getFullYear() : new Date().getFullYear()} ${weekNumber}`;
    const rubiconPeriod = date && date > new Date('2026-01-06T00:00:00') ? 'Rubicon Hauling' : 'Pre-Rubicon';
    const co2eAvoidedPerMile = milesDriven ? co2eLbs / milesDriven : 0;
    const dailySCG = daysSinceFirstCollection ? netLbs / daysSinceFirstCollection : 0;
    const methaneAvoided = co2eLbs / 28;
    const scgLbsPerMile = milesDriven ? netLbs / milesDriven : 0;
    const transportationCO2e = milesDriven * 0.89;
    const windowMax = netLbs === maxNetValue ? 'Max' : 'Other';

    return {
      ...row,
      Date: date,
      Net_lbs: netLbs,
      CO2e_lbs: co2eLbs,
      MilesDriven: milesDriven,
      DaysBetweenCollections: daysBetweenCollections,
      DaysSinceFirstCollection: daysSinceFirstCollection,
      RubiconPeriod: rubiconPeriod,
      StoreNumber: storeNumber,
      StoreShortened: storeShortened,
      StoreNumberAndName: `${storeNumber} (${storeShortened})`,
      YearWeek: yearWeek,
      CO2eAvoidedPerMile: co2eAvoidedPerMile,
      DailySCG: dailySCG,
      MethaneAvoided: methaneAvoided,
      SCGlbsPerMile: scgLbsPerMile,
      TransportationCO2e: transportationCO2e,
      WindowMax: windowMax,
    };
  });
};

export default function DashboardPage() {
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      const data = await loadExcelData();

      if (!active) {
        return;
      }

      setRecords(deriveDashboardRows(data));
      setIsLoading(false);
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const weeklyData = !isLoading && records.length
    ? Object.values(
        records.reduce<Record<string, { week: string; pounds: number }>>((acc, row) => {
          const week = row.YearWeek;
          const current = acc[week] ?? { week, pounds: 0 };
          current.pounds += row.Net_lbs;
          acc[week] = current;
          return acc;
        }, {})
      ).sort((a, b) => a.week.localeCompare(b.week))
    : [];

  const storeData = !isLoading && records.length
    ? Object.values(
        records.reduce<Record<string, { store: string; pounds: number }>>((acc, row) => {
          const current = acc[row.StoreShortened] ?? { store: row.StoreShortened, pounds: 0 };
          current.pounds += row.Net_lbs;
          acc[row.StoreShortened] = current;
          return acc;
        }, {})
      ).sort((a, b) => b.pounds - a.pounds)
    : [];

  const totalDiverted = records.reduce((sum, row) => sum + row.Net_lbs, 0);
  const totalCo2e = records.reduce((sum, row) => sum + row.CO2e_lbs, 0);
  const collectionCount = records.length;
  const avgPerCollection = collectionCount ? totalDiverted / collectionCount : 0;
  const weeklySet = new Set(records.map((row) => row.YearWeek));
  const avgWeeklySCG = weeklySet.size ? totalDiverted / weeklySet.size : 0;
  const ytdNetLbs = records.filter((row) => {
    const date = row.Date;
    const now = new Date();
    return date && date.getFullYear() === now.getFullYear() && date <= now;
  }).reduce((sum, row) => sum + row.Net_lbs, 0);
  const stdevDaysBetweenCollections = computeStdDev(records.map((row) => row.DaysBetweenCollections));
  const windowMaxValue = records.reduce((maxValue, row) => Math.max(maxValue, row.Net_lbs), 0);
  const maxWindowRow = records.find((row) => row.Net_lbs === windowMaxValue) ?? records[0];

  const kpis = isLoading
    ? [
        { label: 'Total diverted', value: '—', detail: 'Loading Excel data...', icon: RecyclingOutlinedIcon, color: '#e56b43' },
        { label: 'CO2e avoided', value: '—', detail: 'Loading Excel data...', icon: Co2OutlinedIcon, color: '#2e8b78' },
        { label: 'Collections', value: '—', detail: 'Loading Excel data...', icon: AssessmentOutlinedIcon, color: '#d09a2f' },
        { label: 'Avg. per collection', value: '—', detail: 'Loading Excel data...', icon: LocalShippingOutlinedIcon, color: '#4f77a8' },
      ]
    : [
        { label: 'Total diverted', value: `${totalDiverted.toFixed(0)} lbs`, detail: `${avgWeeklySCG.toFixed(0)} avg weekly lbs`, icon: RecyclingOutlinedIcon, color: '#e56b43' },
        { label: 'CO2e avoided', value: `${totalCo2e.toFixed(0)} lbs`, detail: `${ytdNetLbs.toFixed(0)} YTD lbs`, icon: Co2OutlinedIcon, color: '#2e8b78' },
        { label: 'Collections', value: String(collectionCount), detail: `STDEV ${stdevDaysBetweenCollections.toFixed(1)}`, icon: AssessmentOutlinedIcon, color: '#d09a2f' },
        { label: 'Avg. per collection', value: `${avgPerCollection.toFixed(0)} lbs`, detail: maxWindowRow ? `${maxWindowRow.StoreShortened} peak ${maxWindowRow.Net_lbs.toFixed(0)} lbs` : 'Peak row loaded', icon: LocalShippingOutlinedIcon, color: '#4f77a8' },
      ];

  const chartRangeLabel = isLoading ? 'Loading dataset...' : `${records.length} rows loaded`;

  return (
    <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ color: '#2e8b78', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>Diversion report</Typography>
          <Typography variant='h4' sx={{ mt: 0.5, fontWeight: 800, color: '#253730' }}>Coffee grounds, put to work.</Typography>
          <Typography sx={{ color: '#65746d', mt: 0.75 }}>A live snapshot of community collection impact.</Typography>
        </Box>
        <Chip label={chartRangeLabel} sx={{ bgcolor: '#e4f0eb', color: '#246957', fontWeight: 700 }} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {kpis.map(({ label, value, detail, icon: Icon, color }) => (
          <Paper key={label} sx={{ p: 2.25, border: '1px solid #e2e9e5', borderRadius: 2, boxShadow: '0 4px 18px rgba(37, 55, 48, 0.06)' }}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
              <Typography sx={{ color: '#65746d', fontSize: 13, fontWeight: 700 }}>{label}</Typography>
              <Icon sx={{ color, fontSize: 22 }} />
            </Stack>
            <Typography sx={{ color: '#253730', fontSize: 28, fontWeight: 800, mt: 1 }}>{value}</Typography>
            <Typography sx={{ color: '#708078', fontSize: 12, mt: 0.5 }}>{detail}</Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.65fr) minmax(300px, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid #e2e9e5', borderRadius: 2, boxShadow: '0 4px 18px rgba(37, 55, 48, 0.06)' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant='h6' sx={{ color: '#253730', fontWeight: 800 }}>Weekly diversion</Typography>
            <Typography sx={{ color: '#708078', fontSize: 13 }}>Net pounds collected by week</Typography>
          </Box>
          <Box sx={{ width: '100%', height: 290 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#708078' }}>
                Loading Excel data...
              </Box>
            ) : (
              <ResponsiveContainer>
                <LineChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke='#e7eeea' vertical={false} />
                  <XAxis dataKey='week' tick={{ fill: '#708078', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#708078', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} lbs`, 'Collected']} />
                  <Line type='monotone' dataKey='pounds' stroke='#2e8b78' strokeWidth={3} dot={{ r: 4, fill: '#fffdf9', strokeWidth: 2, stroke: '#2e8b78' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>

        <Paper sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid #e2e9e5', borderRadius: 2, boxShadow: '0 4px 18px rgba(37, 55, 48, 0.06)' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant='h6' sx={{ color: '#253730', fontWeight: 800 }}>Store ranking</Typography>
            <Typography sx={{ color: '#708078', fontSize: 13 }}>Total pounds diverted</Typography>
          </Box>
          <Box sx={{ width: '100%', height: 290 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#708078' }}>
                Loading Excel data...
              </Box>
            ) : (
              <ResponsiveContainer>
                <BarChart data={storeData} layout='vertical' margin={{ top: 4, right: 14, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke='#e7eeea' horizontal={false} />
                  <XAxis type='number' tick={{ fill: '#708078', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type='category' dataKey='store' width={72} tick={{ fill: '#4d5e56', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} lbs`, 'Diverted']} />
                  <Bar dataKey='pounds' fill='#e56b43' radius={[0, 5, 5, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
