import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import Co2OutlinedIcon from "@mui/icons-material/Co2Outlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import RecyclingOutlinedIcon from "@mui/icons-material/RecyclingOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Paper from "@mui/material/Paper";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadExcelData, type ExcelRecord } from "../data/loadExcel";

const colors = {
  background: "#121212",
  text: "#F2F2F2",
  muted: "#A8ADA9",
  green: "#4CAF50",
  card: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.1)",
};

type DashboardRecord = ExcelRecord & {
  Date: Date | null;
  Net_lbs: number;
  CO2e_lbs: number;
  MilesDriven: number;
  DaysBetweenCollections: number;
  StoreNumber: string;
  StoreShortened: string;
  RubiconPeriod: "Rubicon Hauling" | "Pre-Rubicon";
  YearWeek: string;
  DailySCG: number;
  MethaneAvoided: number;
  CardboardLbs: number;
  MasterGardener: number;
  TransportationCO2e: number;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value: unknown): Date | null => {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStoreNumber = (store: unknown): string => {
  const value = String(store ?? "").trim();
  if (!value) return "Unknown";
  if (value.includes("Stanton")) return "8962";
  if (value.includes("Red Banks")) return "8582";
  if (value.includes("100 East 10th Street")) return "13481";
  if (value.includes("Winterville")) return "27296";
  return value;
};

const getStoreShortened = (store: unknown): string => {
  const value = String(store ?? "").trim();
  if (!value) return "Unknown";
  if (value.includes("Stanton")) return "Stanton";
  if (value.includes("Red Banks")) return "Red Banks";
  if (value.includes("100 East 10th Street")) return "10th St";
  if (value.includes("Winterville")) return "Winterville";
  return value;
};

const formatNumber = (value: number, digits = 0) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });
const formatDate = (date: Date | null) =>
  date ? date.toLocaleDateString() : "Unknown";
const isoDate = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : "";
const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
type MonthlyRow = {
  month: string;
  monthNumber: number;
  total: number;
  [year: string]: string | number;
};
type MonthFilter = { year: number; month: number } | null;
type StoreMetric = {
  store: string;
  storeNumber: string;
  label: string;
  pounds: number;
};
const stdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      (values.length - 1),
  );
};

const deriveRows = (records: ExcelRecord[]): DashboardRecord[] =>
  records.map((row) => {
    const date = normalizeDate(row.Date);
    const netLbs = toNumber(row["Net lbs"]);
    const co2eLbs = toNumber(row["CO2e (lbs)"]) || netLbs * 0.154;
    const milesDriven = toNumber(row["Miles Driven"]);
    const daysBetweenCollections = toNumber(
      row["# of Days between collections"],
    );
    const weekNumber = toNumber(row["Week #"]);
    const storeNumber = getStoreNumber(row.Store);
    const storeShortened = getStoreShortened(row.Store);
    return {
      ...row,
      Date: date,
      Net_lbs: netLbs,
      CO2e_lbs: co2eLbs,
      MilesDriven: milesDriven,
      DaysBetweenCollections: daysBetweenCollections,
      StoreNumber: storeNumber,
      StoreShortened: storeShortened,
      RubiconPeriod:
        date && date > new Date("2026-01-06T00:00:00")
          ? "Rubicon Hauling"
          : "Pre-Rubicon",
      YearWeek: `${date?.getFullYear() ?? "Unknown"} ${weekNumber}`,
      DailySCG: daysBetweenCollections ? netLbs / daysBetweenCollections : 0,
      MethaneAvoided: co2eLbs / 28,
      CardboardLbs: toNumber(row["Cardboard (lbs)"]),
      MasterGardener: toNumber(row["Master Gardener"]),
      TransportationCO2e: milesDriven * 0.89,
    };
  });

const panelSx = {
  p: { xs: 2, md: 2.5 },
  bgcolor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 2,
  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
};
const tableCellSx = {
  color: colors.text,
  borderColor: colors.border,
  whiteSpace: "nowrap",
};
const tooltipStyle = {
  backgroundColor: "#242424",
  border: `1px solid ${colors.border}`,
  color: colors.text,
  borderRadius: 1,
};
const filterMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: "#1E1E1E",
      color: colors.text,
      border: `1px solid ${colors.border}`,
      "& .MuiMenuItem-root:hover": { bgcolor: "rgba(76,175,80,.18)" },
      "& .MuiMenuItem-root.Mui-selected": { bgcolor: "rgba(76,175,80,.28)" },
    },
  },
};
const infoText = `Hover functionality\nYou can hover over all visuals for more information and definitions.\n\nFilters\nRubicon Period\nThis filter allows you to switch between the full historical record of SCG collections by Hidden Leaf Farm and the period beginning January 6, 2026, when HLF began hauling with Rubicon Waste & Recycling.\n- All History shows every collection since program launch.\n- Rubicon Hauling isolates data from the start of Rubicon service onward.\n\nDate Filters\nUse these filters to filter the dashboard by Year, Quarter and Month.\n\nStore\nUse this filter to filter the dashboard by Store.\n\nData Source & Methodology\n- SCG diversion data is collected from store-level logs and processed via Alteryx for cleaning, aggregation, and CO2e calculations.\n- CO2e avoided is calculated using EPA WARM composting emission factors for food waste (0.154 lbs CO2e avoided per lb diverted).\n- Methane avoided is derived using a GWP factor of 28.\n- Transportation emissions are calculated using EPA average of 0.89 lbs CO2e per mile driven.\n\nAll metrics are visualized in Tableau and updated weekly.\nFor questions or audit support, contact Hidden Leaf Foundation - contact@hiddenleaf.farm`;

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof RecyclingOutlinedIcon;
}) {
  return (
    <Paper sx={{ ...panelSx, minHeight: 112 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography className="tableau-label">{label}</Typography>
        {Icon && <Icon sx={{ color: colors.green, fontSize: 21 }} />}
      </Stack>
      <Typography
        sx={{
          mt: 1,
          color: colors.text,
          fontSize: { xs: 25, md: 29 },
          fontWeight: 800,
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

function SectionTitle({ title, detail, sx }: { title: string; detail?: string; sx?: object }) {
  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Typography variant="h6" sx={{ color: colors.text, fontWeight: 800 }}>
        {title}
      </Typography>
      {detail && (
        <Typography sx={{ color: colors.muted, fontSize: 13, mt: 0.4 }}>
          {detail}
        </Typography>
      )}
    </Box>
  );
}

function StoreDetailsTable({
  stores,
  rows,
  sx,
}: {
  stores: StoreMetric[];
  rows: DashboardRecord[];
  sx?: object;
}) {
  return (
    <Box sx={{ mt: { xs: 3, lg: 0 }, ...sx }}>
      <SectionTitle title="Store Performance Details" />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                "Store",
                "Daily SCG",
                "No. of Collections",
                "Avg Weekly SCG",
                "Max Single Collection",
                "CO2e Diverted",
              ].map((label) => (
                <TableCell
                  key={label}
                  align={label === "Store" ? "left" : "right"}
                  sx={tableCellSx}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {stores.map((store) => {
              const storeRows = rows.filter(
                (row) => row.StoreNumber === store.storeNumber,
              );
              const total = storeRows.reduce(
                (sum, row) => sum + row.Net_lbs,
                0,
              );
              return (
                <TableRow key={store.storeNumber}>
                  <TableCell sx={tableCellSx}>{store.label}</TableCell>
                  <TableCell align="right" sx={tableCellSx}>
                    {formatNumber(
                      mean(storeRows.map((row) => row.DailySCG)),
                      1,
                    )}
                  </TableCell>
                  <TableCell align="right" sx={tableCellSx}>
                    {storeRows.length}
                  </TableCell>
                  <TableCell align="right" sx={tableCellSx}>
                    {formatNumber(
                      total /
                        Math.max(
                          new Set(storeRows.map((row) => row.YearWeek)).size,
                          1,
                        ),
                    )}
                  </TableCell>
                  <TableCell align="right" sx={tableCellSx}>
                    {formatNumber(
                      Math.max(...storeRows.map((row) => row.Net_lbs), 0),
                    )}
                  </TableCell>
                  <TableCell align="right" sx={tableCellSx}>
                    {formatNumber(
                      storeRows.reduce((sum, row) => sum + row.CO2e_lbs, 0),
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function DashboardPage() {
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [period, setPeriod] = useState("All periods");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthFilter, setMonthFilter] = useState<MonthFilter>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<"Date" | "Net_lbs" | "StoreNumber">(
    "Date",
  );
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let active = true;
    void loadExcelData().then((data) => {
      if (active) {
        setRecords(deriveRows(data));
        setLastUpdated(new Date());
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const storeOptions = useMemo(
    () => [...new Set(records.map((row) => row.StoreNumber))].sort(),
    [records],
  );
  const baseFilteredRows = useMemo(
    () =>
      records.filter((row) => {
        const date = isoDate(row.Date);
        return (
          (!selectedStores.length ||
            selectedStores.includes(row.StoreNumber)) &&
          (period === "All periods" || row.RubiconPeriod === period) &&
          (!startDate || date >= startDate) &&
          (!endDate || date <= endDate)
        );
      }),
    [records, selectedStores, period, startDate, endDate],
  );
  const filteredRows = useMemo(
    () =>
      baseFilteredRows.filter(
        (row) =>
          !monthFilter ||
          (row.Date?.getMonth() === monthFilter.month &&
            (monthFilter.year === 0 ||
              row.Date.getFullYear() === monthFilter.year)),
      ),
    [baseFilteredRows, monthFilter],
  );
  const weeklyData = useMemo(() => {
    let runningTotal = 0;
    return Object.values(
      filteredRows.reduce<
        Record<string, { date: Date | null; week: string; netLbs: number }>
      >((acc, row) => {
        const key = isoDate(row.Date) || row.YearWeek;
        const current = acc[key] ?? {
          date: row.Date,
          week: row.YearWeek,
          netLbs: 0,
        };
        current.netLbs += row.Net_lbs;
        acc[key] = current;
        return acc;
      }, {}),
    )
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
      .map((row) => {
        runningTotal += row.netLbs;
        return { ...row, dateLabel: formatDate(row.date), runningTotal };
      });
  }, [filteredRows]);
  const storeData = useMemo<StoreMetric[]>(
    () =>
      Object.values(
        filteredRows.reduce<Record<string, StoreMetric>>((acc, row) => {
          const current = acc[row.StoreNumber] ?? {
            store: row.StoreShortened,
            storeNumber: row.StoreNumber,
            label: `${row.StoreNumber} - ${row.StoreShortened}`,
            pounds: 0,
          };
          current.pounds += row.Net_lbs;
          acc[row.StoreNumber] = current;
          return acc;
        }, {}),
      ).sort((a, b) => b.pounds - a.pounds),
    [filteredRows],
  );
  const totalDiverted = filteredRows.reduce((sum, row) => sum + row.Net_lbs, 0);
  const totalCo2e = filteredRows.reduce((sum, row) => sum + row.CO2e_lbs, 0);
  const weeklyCount = new Set(filteredRows.map((row) => row.YearWeek)).size;
  const totalMiles = filteredRows.reduce(
    (sum, row) => sum + row.MilesDriven,
    0,
  );
  const totalTransportation = filteredRows.reduce(
    (sum, row) => sum + row.TransportationCO2e,
    0,
  );
  const metrics = {
    totalDiverted,
    avgWeekly: weeklyCount ? totalDiverted / weeklyCount : 0,
    donated: filteredRows.reduce((sum, row) => sum + row.MasterGardener, 0),
    collections: filteredRows.length,
    co2e: totalCo2e,
    methane: filteredRows.reduce((sum, row) => sum + row.MethaneAvoided, 0),
  };
  const operations = [
    [
      "Avg Days Between Collections",
      formatNumber(
        mean(filteredRows.map((row) => row.DaysBetweenCollections)),
        1,
      ),
    ],
    [
      "Pickup Interval Variance",
      formatNumber(
        stdDev(filteredRows.map((row) => row.DaysBetweenCollections)),
        1,
      ),
    ],
    ["Miles Driven", formatNumber(totalMiles, 1)],
    [
      "CO2e Generated from Driving",
      `${formatNumber(totalTransportation, 1)} lbs`,
    ],
    [
      "SCG per Mile Driven",
      formatNumber(totalMiles ? totalDiverted / totalMiles : 0, 1),
    ],
    [
      "CO2e Avoided per Mile",
      formatNumber(totalMiles ? totalCo2e / totalMiles : 0, 1),
    ],
  ];
  const monthlyData = useMemo<MonthlyRow[]>(() => {
    const rows = new Map<string, Record<string, number>>();
    baseFilteredRows.forEach((row) => {
      if (!row.Date) return;
      const month = row.Date.toLocaleString(undefined, { month: "short" });
      const current = rows.get(month) ?? {
        monthNumber: row.Date.getMonth(),
        "2023": 0,
        "2024": 0,
        "2025": 0,
        "2026": 0,
      };
      const year = String(row.Date.getFullYear());
      if (year in current) current[year] += row.Net_lbs;
      rows.set(month, current);
    });
    return [...rows.entries()]
      .map(([month, values]) => ({
        month,
        monthNumber: values.monthNumber,
        ...values,
        total: Object.keys(values)
          .filter((key) => /^20/.test(key))
          .reduce((sum, year) => sum + Number(values[year] ?? 0), 0),
      }))
      .sort((a, b) => a.monthNumber - b.monthNumber);
  }, [baseFilteredRows]);
  const yearlyMax = useMemo(
    () =>
      Object.fromEntries(
        ["2023", "2024", "2025", "2026"].map((year) => [
          year,
          Math.max(...monthlyData.map((row) => Number(row[year] ?? 0)), 0),
        ]),
      ),
    [monthlyData],
  );
  const monthlyMax = useMemo(
    () => Math.max(...monthlyData.map((row) => row.total), 0),
    [monthlyData],
  );
  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        const left =
          sortKey === "Date"
            ? (a.Date?.getTime() ?? 0)
            : sortKey === "Net_lbs"
              ? a.Net_lbs
              : a.StoreNumber;
        const right =
          sortKey === "Date"
            ? (b.Date?.getTime() ?? 0)
            : sortKey === "Net_lbs"
              ? b.Net_lbs
              : b.StoreNumber;
        return (left < right ? -1 : left > right ? 1 : 0) * (sortAsc ? 1 : -1);
      }),
    [filteredRows, sortKey, sortAsc],
  );
  const pickupRows = useMemo(() => {
    const grouped = new Map<string, DashboardRecord[]>();
    sortedRows.forEach((row) =>
      grouped.set(row.YearWeek, [...(grouped.get(row.YearWeek) ?? []), row]),
    );
    return [...grouped.entries()].flatMap(([week, rows]) => [
      ...rows.map((row, index) => ({
        id: `${row.StoreNumber}-${isoDate(row.Date)}-${index}`,
        kind: "pickup" as const,
        week: row.YearWeek,
        date: formatDate(row.Date),
        storeNumber: row.StoreNumber,
        storeName: row.StoreShortened,
        netLbs: Number(row.Net_lbs.toFixed(1)),
        perDayLbs: Number(row.DailySCG.toFixed(1)),
        co2eDiverted: Number(row.CO2e_lbs.toFixed(1)),
        cardboardLbs: Number(row.CardboardLbs.toFixed(1)),
      })),
      {
        id: `subtotal-${week}`,
        kind: "subtotal" as const,
        week: `${week} Weekly Total`,
        date: "",
        storeNumber: "",
        storeName: "",
        netLbs: Number(
          rows.reduce((sum, row) => sum + row.Net_lbs, 0).toFixed(1),
        ),
        perDayLbs: Number(mean(rows.map((row) => row.DailySCG)).toFixed(1)),
        co2eDiverted: Number(
          rows.reduce((sum, row) => sum + row.CO2e_lbs, 0).toFixed(1),
        ),
        cardboardLbs: Number(
          rows.reduce((sum, row) => sum + row.CardboardLbs, 0).toFixed(1),
        ),
      },
    ]);
  }, [sortedRows]);
  const resetFilters = () => {
    setSelectedStores([]);
    setPeriod("All periods");
    setStartDate("");
    setEndDate("");
    setMonthFilter(null);
    setPage(0);
  };
  const pickupColumns: GridColDef[] = [
    { field: "week", headerName: "Week", flex: 1, minWidth: 140 },
    { field: "date", headerName: "Date", flex: 1, minWidth: 110 },
    {
      field: "storeNumber",
      headerName: "Store Number",
      flex: 1,
      minWidth: 120,
    },
    { field: "storeName", headerName: "Store Name", flex: 1.2, minWidth: 130 },
    {
      field: "netLbs",
      headerName: "Net lbs",
      flex: 1,
      minWidth: 100,
      type: "number",
    },
    {
      field: "perDayLbs",
      headerName: "Per Day lbs",
      flex: 1,
      minWidth: 110,
      type: "number",
    },
    {
      field: "co2eDiverted",
      headerName: "CO2e Diverted",
      flex: 1,
      minWidth: 125,
      type: "number",
    },
    {
      field: "cardboardLbs",
      headerName: "Cardboard lbs",
      flex: 1,
      minWidth: 120,
      type: "number",
    },
  ];
  const setSort = (key: "Date" | "Net_lbs" | "StoreNumber") => {
    setSortAsc(sortKey === key ? !sortAsc : false);
    setSortKey(key);
  };
  const handleStoreChange = (event: SelectChangeEvent<string[]>) =>
    setSelectedStores(
      typeof event.target.value === "string"
        ? event.target.value.split(",")
        : event.target.value,
    );
  const kpis = [
    [
      "Total SCG Diverted",
      `${formatNumber(metrics.totalDiverted)} lbs`,
      RecyclingOutlinedIcon,
    ],
    [
      "AVG Weekly SCG",
      `${formatNumber(metrics.avgWeekly)} lbs`,
      AssessmentOutlinedIcon,
    ],
    [
      "Donated to Arboretum",
      `${formatNumber(metrics.donated)} lbs`,
      RecyclingOutlinedIcon,
    ],
    [
      "No. of Collections",
      formatNumber(metrics.collections),
      LocalShippingOutlinedIcon,
    ],
    [
      "Total CO2e Diverted",
      `${formatNumber(metrics.co2e)} lbs`,
      Co2OutlinedIcon,
    ],
    [
      "Methane Diverted",
      `${formatNumber(metrics.methane)} lbs`,
      Co2OutlinedIcon,
    ],
  ] as const;

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <img
            src="/hlf-logo.png"
            alt="Hidden Leaf Farm & Foundation"
            className="dashboard-logo"
          />
          <Box>
            <Typography className="tableau-label" sx={{ color: colors.green }}>
              HLF SCG REPORTING
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mt: 0.5,
                color: colors.text,
                fontWeight: 800,
                fontSize: { xs: "1.55rem", md: "2.125rem" },
              }}
            >
              Hidden Leaf Farm &amp; Foundation Spent Coffee Grounds Diversion
            </Typography>
            <Typography sx={{ color: colors.muted, mt: 0.5 }}>
              Last Updated on {lastUpdated?.toLocaleString() ?? "Loading..."}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={
              isLoading
                ? "Loading Excel data..."
                : `${filteredRows.length} pickups`
            }
            sx={{
              bgcolor: "rgba(76,175,80,.16)",
              color: "#8be28f",
              fontWeight: 700,
            }}
          />
          <Tooltip
            title={
              <Box
                sx={{
                  whiteSpace: "pre-line",
                  maxWidth: 420,
                  p: 1,
                  fontSize: 12,
                }}
              >
                {infoText}
              </Box>
            }
            arrow
          >
            <Button
              aria-label="Dashboard information"
              sx={{ minWidth: 40, color: colors.green }}
            >
              <InfoOutlinedIcon />
            </Button>
          </Tooltip>
        </Stack>
      </Box>
      <Paper
        sx={{
          ...panelSx,
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Store</InputLabel>
          <Select
            MenuProps={filterMenuProps}
            multiple
            value={selectedStores}
            onChange={handleStoreChange}
            input={<OutlinedInput label="Store" />}
            renderValue={(selected) => selected.join(", ")}
          >
            {storeOptions.map((store) => (
              <MenuItem key={store} value={store}>
                <Checkbox checked={selectedStores.includes(store)} />
                <ListItemText primary={store} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Rubicon period</InputLabel>
          <Select
            MenuProps={filterMenuProps}
            value={period}
            label="Rubicon period"
            onChange={(event) => setPeriod(event.target.value)}
          >
            <MenuItem value="All periods">All periods</MenuItem>
            <MenuItem value="Pre-Rubicon">Pre-Rubicon</MenuItem>
            <MenuItem value="Rubicon Hauling">Rubicon Hauling</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Start date"
          type="date"
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{
            "& .MuiInputBase-root": { bgcolor: "#1E1E1E", color: colors.text },
            "& input": { color: colors.text },
          }}
        />
        <TextField
          size="small"
          label="End date"
          type="date"
          value={endDate}
          onChange={(event) => {
            setEndDate(event.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{
            "& .MuiInputBase-root": { bgcolor: "#1E1E1E", color: colors.text },
            "& input": { color: colors.text },
          }}
        />
        <Button
          onClick={resetFilters}
          startIcon={<RestartAltOutlinedIcon />}
          sx={{ color: colors.green }}
        >
          Reset Filters
        </Button>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {kpis.map(([label, value, icon]) => (
          <MetricCard
            key={label}
            label={label}
            value={isLoading ? "—" : value}
            icon={icon}
          />
        ))}
      </Box>
      <Paper sx={panelSx}>
        <SectionTitle title="Operations Details" />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              lg: "repeat(6, 1fr)",
            },
            gap: 1.5,
          }}
        >
          {operations.map(([label, value]) => (
            <Box
              key={label}
              sx={{
                p: 1.5,
                minHeight: 86,
                display: "flex",
                flexDirection: "column",
                border: `1px solid ${colors.border}`,
                borderRadius: 1,
              }}
            >
              <Typography
                className="tableau-label"
                sx={{ minHeight: 34, lineHeight: 1.25 }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  mt: "auto",
                  color: colors.text,
                  fontSize: 16,
                  lineHeight: 1.2,
                  fontWeight: 800,
                }}
              >
                {isLoading ? "—" : value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 2,
        }}
      >
        <Paper sx={panelSx}>
          <SectionTitle
            title="Running Total"
            detail="Cumulative SCG diverted over time"
          />
          <Box sx={{ height: 320 }}>
            {!isLoading && (
              <ResponsiveContainer>
                <ComposedChart
                  data={weeklyData}
                  margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
                >
                  <CartesianGrid stroke={colors.border} vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="weekly"
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="running"
                    orientation="right"
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(label) => `Date: ${label}`}
                    formatter={(value, name) => [`${formatNumber(Number(value))} lbs`, name === "runningTotal" ? "Running Total" : "Weekly Net SCG"]}
                  />
                  <Bar
                    yAxisId="weekly"
                    dataKey="netLbs"
                    name="Weekly Net SCG"
                    fill={colors.green}
                    opacity={0.85}
                    radius={[3, 3, 0, 0]}
                    barSize={24}
                  />
                  <Line
                    yAxisId="running"
                    dataKey="runningTotal"
                    name="Running Total"
                    type="monotone"
                    stroke="#8C8C8C"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>
        <Paper
          sx={{
            ...panelSx,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.15fr) minmax(360px, 1fr)" },
            columnGap: 3,
            alignItems: "start",
          }}
        >
          <SectionTitle
            title="Store Performance"
            detail="Click a bar to filter the dashboard"
            sx={{ gridColumn: "1 / -1" }}
          />
          <Box sx={{ height: 320, minWidth: 0 }}>
            {!isLoading && (
              <ResponsiveContainer>
                <BarChart
                  data={storeData}
                  layout="vertical"
                  margin={{ top: 4, right: 14, left: 8, bottom: 4 }}
                  onClick={(state) => {
                    const store =
                      state?.activePayload?.[0]?.payload?.storeNumber;
                    if (store) setSelectedStores([store]);
                  }}
                >
                  <CartesianGrid stroke={colors.border} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={136}
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      `${formatNumber(Number(value))} lbs`,
                      "Total SCG",
                    ]}
                  />
                  <Bar
                    dataKey="pounds"
                    fill={colors.green}
                    radius={[0, 4, 4, 0]}
                    barSize={22}
                  >
                    <LabelList
                      dataKey="pounds"
                      position="right"
                      formatter={(value: number) =>
                        `${formatNumber(value)} lbs`
                      }
                      fill="#B7E3B8"
                      fontSize={10}
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
          <StoreDetailsTable
            stores={storeData}
            rows={filteredRows}
            sx={{ minWidth: 0 }}
          />
        </Paper>
      </Box>
      <Paper sx={panelSx}>
        <SectionTitle
          title="Monthly / Yearly Diversion"
          detail={
            monthFilter
              ? "Click Reset Filters to return to all months"
              : "Click any month or year value to filter the dashboard"
          }
        />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Month", "2023", "2024", "2025", "2026", "Grand Total"].map(
                  (label) => (
                    <TableCell
                      key={label}
                      align={label === "Month" ? "left" : "right"}
                      sx={{ ...tableCellSx, fontWeight: 800 }}
                    >
                      {label}
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyData.map((row, index) => (
                <TableRow
                  key={row.month}
                  sx={{
                    bgcolor:
                      index % 2 ? "rgba(255,255,255,0.025)" : "transparent",
                  }}
                >
                  <TableCell
                    onClick={() =>
                      setMonthFilter({
                        year: 0,
                        month: Number(row.monthNumber),
                      })
                    }
                    sx={{ ...tableCellSx, cursor: "pointer" }}
                  >
                    {row.month}
                  </TableCell>
                  {["2023", "2024", "2025", "2026"].map((year) => {
                    const value = Number(row[year] ?? 0);
                    const active = value > 0 && value === yearlyMax[year];
                    return (
                      <TableCell
                        key={year}
                        onClick={() =>
                          value > 0 &&
                          setMonthFilter({
                            year: Number(year),
                            month: Number(row.monthNumber),
                          })
                        }
                        align="right"
                        sx={{
                          ...tableCellSx,
                          fontWeight: active ? 900 : 400,
                          color: active ? "#9cf29f" : colors.text,
                          bgcolor: active ? "rgba(76,175,80,.22)" : undefined,
                          cursor: value > 0 ? "pointer" : "default",
                        }}
                      >
                        {formatNumber(value)}
                      </TableCell>
                    );
                  })}
                  <TableCell
                    onClick={() =>
                      row.total > 0 &&
                      setMonthFilter({
                        year: 0,
                        month: Number(row.monthNumber),
                      })
                    }
                    align="right"
                    sx={{
                      ...tableCellSx,
                      fontWeight: 800,
                      color: row.total === monthlyMax ? "#9cf29f" : colors.text,
                      bgcolor:
                        row.total === monthlyMax
                          ? "rgba(76,175,80,.22)"
                          : undefined,
                      cursor: row.total > 0 ? "pointer" : "default",
                    }}
                  >
                    {formatNumber(row.total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "rgba(76,175,80,.12)" }}>
                <TableCell sx={{ ...tableCellSx, fontWeight: 800 }}>
                  Grand Total
                </TableCell>
                {["2023", "2024", "2025", "2026"].map((year) => (
                  <TableCell
                    key={year}
                    align="right"
                    sx={{ ...tableCellSx, fontWeight: 800 }}
                  >
                    {formatNumber(
                      monthlyData.reduce(
                        (sum, row) => sum + Number(row[year] ?? 0),
                        0,
                      ),
                    )}
                  </TableCell>
                ))}
                <TableCell
                  align="right"
                  sx={{ ...tableCellSx, fontWeight: 900, color: "#9cf29f" }}
                >
                  {formatNumber(totalDiverted)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 3 }}>
          <SectionTitle
            title="Pickup Log"
            detail="Grouped by week with Tableau-style weekly totals"
          />
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={pickupRows}
              columns={pickupColumns}
              getRowClassName={(params) =>
                params.row.kind === "subtotal" ? "weekly-total-row" : ""
              }
              paginationModel={{ page, pageSize: rowsPerPage }}
              onPaginationModelChange={(model) => {
                setPage(model.page);
                setRowsPerPage(model.pageSize);
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              sx={{
                border: `1px solid ${colors.border}`,
                color: colors.text,
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "#242424",
                  color: colors.text,
                  borderColor: colors.border,
                },
                "& .MuiDataGrid-cell": { borderColor: colors.border },
                "& .MuiTablePagination-root": { color: colors.muted },
                "& .MuiDataGrid-footerContainer": {
                  borderColor: colors.border,
                },
                "& .weekly-total-row": {
                  bgcolor: "rgba(76,175,80,.16)",
                  fontWeight: 800,
                },
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
