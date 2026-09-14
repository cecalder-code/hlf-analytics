import * as XLSX from 'xlsx';

export type ExcelRecord = Record<string, string | number | boolean | Date | null>;

const EXCEL_FILE_PATH = '../../Coffee Grounds Data - Alteryx Output.xlsx';

function normalizeRow(row: Record<string, unknown>): ExcelRecord {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [String(key).trim(), value ?? null])
  ) as ExcelRecord;
}

export async function loadExcelData(): Promise<ExcelRecord[]> {
  try {
    const fileUrl = new URL(EXCEL_FILE_PATH, import.meta.url);
    const response = await fetch(fileUrl.href);

    if (!response.ok) {
      throw new Error(`Unable to load Excel file: ${response.status} ${response.statusText}`);
    }

    const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet) {
      return [];
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: false,
    });

    return rows.map((row) => normalizeRow(row));
  } catch {
    return [];
  }
}
