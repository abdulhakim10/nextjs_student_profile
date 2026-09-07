/**
 * Opens the browser print dialog for a styled tabular report, so the user
 * can pick a printer or "Save as PDF" and choose where the file goes.
 * Rendered inside a hidden iframe; nothing is downloaded automatically.
 */

export interface PrintColumn<T> {
  header: string;
  /** Cell text. Use "\n" for a line break inside the cell. */
  value: (row: T) => string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface PrintTableOptions<T> {
  title: string;
  subtitle?: string;
  /** Small "label: value" chips shown under the title. */
  meta?: { label: string; value: string }[];
  columns: PrintColumn<T>[];
  rows: T[];
  landscape?: boolean;
  footerNote?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(text: string): string {
  return escapeHtml(text || '-').replace(/\n/g, '<br/>');
}

export function printTable<T>({
  title,
  subtitle,
  meta = [],
  columns,
  rows,
  landscape = true,
  footerNote,
}: PrintTableOptions<T>): void {
  if (typeof window === 'undefined') return;

  const generated = new Date().toLocaleString();

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; font-size: 11px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 12px; }
  h1 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
  .sub { margin: 3px 0 0; color: #6b7280; font-size: 11px; }
  .gen { text-align: right; color: #6b7280; font-size: 10px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .chip { border: 1px solid #e5e7eb; border-radius: 999px; padding: 2px 8px; font-size: 10px; color: #374151; background: #f9fafb; }
  .chip b { color: #111827; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { background: #ecfdf5; color: #065f46; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; padding: 7px 8px; border-bottom: 1px solid #a7f3d0; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; line-height: 1.35; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  tr { page-break-inside: avoid; }
  td.num, th.num { text-align: right; }
  td.center, th.center { text-align: center; }
  .foot { margin-top: 10px; display: flex; justify-content: space-between; color: #6b7280; font-size: 10px; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div class="gen">${escapeHtml(generated)}</div>
  </div>
  ${meta.length ? `<div class="meta">${meta.map((m) => `<span class="chip">${escapeHtml(m.label)}: <b>${escapeHtml(m.value)}</b></span>`).join('')}</div>` : ''}
  <table>
    <thead>
      <tr>
        <th class="num" style="width:36px">#</th>
        ${columns.map((c) => `<th class="${c.align ?? ''}"${c.width ? ` style="width:${c.width}"` : ''}>${escapeHtml(c.header)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, i) => `<tr>
        <td class="num">${i + 1}</td>
        ${columns.map((c) => `<td class="${c.align ?? ''}">${cell(c.value(row))}</td>`).join('')}
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <div class="foot">
    <span>${footerNote ? escapeHtml(footerNote) : ''}</span>
    <span>${rows.length} ${rows.length === 1 ? 'record' : 'records'}</span>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 500);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  win.addEventListener('afterprint', cleanup, { once: true });
  // Give the iframe a tick to lay out before printing.
  setTimeout(() => {
    win.focus();
    win.print();
  }, 150);
}
