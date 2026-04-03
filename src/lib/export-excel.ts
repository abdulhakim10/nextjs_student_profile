import * as XLSX from 'xlsx';

interface ExportColumn<T> {
  header: string;
  key: keyof T;
  width?: number;
}

export function exportToExcel<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
) {
  const worksheetData = data.map((row) =>
    columns.reduce(
      (acc, col) => {
        acc[col.header] = row[col.key];
        return acc;
      },
      {} as Record<string, unknown>
    )
  );

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  worksheet['!cols'] = columns.map((c) => ({ wch: c.width || 15 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
