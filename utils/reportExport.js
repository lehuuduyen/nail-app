import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCommissionLabel } from '../constants/employeePayOptions';

const SALON_BLOCK = `
        <div class="footer">
        Nice Nails & Spa • 8048 N 19th Ave, Phoenix AZ 85021 • (602) 759-9184
      </div>`;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function getWriteRoot() {
  return FileSystem.documentDirectory || FileSystem.cacheDirectory;
}

async function shareUri(uri, mimeType, dialogTitle) {
  const can = await Sharing.isAvailableAsync();
  if (!can) {
    Alert.alert('Share', 'Sharing is not available on this device.');
    return;
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

function wrapReportHtml(title, dateLabel, innerTable) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #E53935; padding-bottom: 10px; }
        .salon-name { font-size: 24px; font-weight: bold; color: #1a1a2e; }
        .report-title { font-size: 16px; color: #666; margin: 4px 0; }
        .date-label { font-size: 13px; color: #999; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #1a1a2e; color: white; padding: 10px 8px; text-align: left; font-size: 12px; }
        th:not(:first-child) { text-align: right; }
        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        td:not(:first-child) { text-align: right; }
        .totals-row { background: #f5f5f5; font-weight: bold; }
        .totals-row td { border-top: 2px solid #1a1a2e; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="salon-name">NICE NAILS & SPA</div>
        <div class="report-title">${esc(title)}</div>
        <div class="date-label">${esc(dateLabel)}</div>
        <div class="date-label">Generated: ${esc(new Date().toLocaleString())}</div>
      </div>
      ${innerTable}
      ${SALON_BLOCK}
    </body>
    </html>
  `;
}

function technicianTableHtml(employees, totals) {
  const rows = (employees || []).map(
    (emp) => `
    <tr>
      <td style="font-weight:600">${esc(emp.name)}</td>
      <td style="text-align:center">${emp.tickets}</td>
      <td style="color:#4CAF50">$${Number(emp.amount || 0).toFixed(2)}</td>
      <td style="color:#FF9800">$${Number(emp.tips || 0).toFixed(2)}</td>
      <td style="color:#9C27B0">$${Number(emp.card || 0).toFixed(2)}</td>
      <td style="color:#009688">$${Number(emp.cash || 0).toFixed(2)}</td>
      <td style="font-weight:700;color:#E53935">$${(Number(emp.amount || 0) + Number(emp.tips || 0)).toFixed(2)}</td>
    </tr>`
  );
  const t = totals || {};
  return `
      <table>
        <thead>
          <tr>
            <th>Technician</th><th>Tickets</th><th>Amount</th>
            <th>Tips</th><th>Card</th><th>Cash</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
          <tr class="totals-row">
            <td>TOTAL</td>
            <td style="text-align:center">${t.tickets ?? 0}</td>
            <td>$${Number(t.amount || 0).toFixed(2)}</td>
            <td>$${Number(t.tips || 0).toFixed(2)}</td>
            <td>$${Number(t.card || 0).toFixed(2)}</td>
            <td>$${Number(t.cash || 0).toFixed(2)}</td>
            <td>$${(Number(t.amount || 0) + Number(t.tips || 0)).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>`;
}

function technicianHtml(data, title, dateLabel) {
  return wrapReportHtml(title, dateLabel, technicianTableHtml(data.employees, data.totals));
}

/** --- Technician (tickets) --- */
export async function exportTechnicianCSV(data, filename) {
  const root = await getWriteRoot();
  if (!root) {
    Alert.alert('Export', 'File storage is not available here.');
    return;
  }
  const { employees, totals } = data;
  let csv = 'Technician,Tickets,Amount,Tips,Card,Cash,Total\n';
  (employees || []).forEach((emp) => {
    const total = (Number(emp.amount || 0) + Number(emp.tips || 0)).toFixed(2);
    csv += `${csvCell(emp.name)},${emp.tickets},${Number(emp.amount || 0).toFixed(2)},${Number(emp.tips || 0).toFixed(2)},${Number(emp.card || 0).toFixed(2)},${Number(emp.cash || 0).toFixed(2)},${total}\n`;
  });
  const t = totals || {};
  csv += `TOTAL,${t.tickets ?? 0},${Number(t.amount || 0).toFixed(2)},${Number(t.tips || 0).toFixed(2)},${Number(t.card || 0).toFixed(2)},${Number(t.cash || 0).toFixed(2)},${(Number(t.amount || 0) + Number(t.tips || 0)).toFixed(2)}\n`;

  const path = `${root}${filename}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
  await shareUri(path, 'text/csv', 'Export report');
}

export async function exportTechnicianPDF(data, title, dateLabel) {
  const html = technicianHtml(data, title, dateLabel);
  const { uri } = await Print.printToFileAsync({ html });
  await shareUri(uri, 'application/pdf', 'Export PDF');
}

export async function printTechnicianReport(data, title, dateLabel) {
  const html = technicianHtml(data, title, dateLabel);
  await Print.printAsync({ html });
}

/** --- Store income --- */
export async function exportStoreIncomeCSV(data, filename) {
  const root = await getWriteRoot();
  if (!root) {
    Alert.alert('Export', 'File storage is not available here.');
    return;
  }
  const lines = ['Date,Employee,Amount,Tips,Method,CardLast4,Notes'];
  (data.transactions || []).forEach((t) => {
    const emp = t.Employee ? `${t.Employee.firstName || ''} ${t.Employee.lastName || ''}`.trim() : '';
    const notes = String(t.notes || '').replace(/"/g, '""');
    lines.push(
      `${t.date},"${emp}",${Number(t.amount || 0).toFixed(2)},${Number(t.tips || 0).toFixed(2)},${t.paymentMethod || ''},${t.helcimCardLast4 || ''},"${notes}"`
    );
  });
  const t = data.totals || {};
  lines.push(
    `TOTAL,,${Number(t.total || 0).toFixed(2)},${Number(t.tips || 0).toFixed(2)},,,"tickets ${t.tickets ?? 0}"`
  );
  const path = `${root}${filename}.csv`;
  await FileSystem.writeAsStringAsync(path, lines.join('\n'), { encoding: 'utf8' });
  await shareUri(path, 'text/csv', 'Export report');
}

function storeIncomeTableHtml(transactions) {
  const rows = (transactions || []).map(
    (t) => `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${esc(t.Employee ? `${t.Employee.firstName || ''} ${t.Employee.lastName || ''}`.trim() : '')}</td>
      <td>$${Number(t.amount || 0).toFixed(2)}</td>
      <td>$${Number(t.tips || 0).toFixed(2)}</td>
      <td>${esc(t.paymentMethod)}</td>
    </tr>`
  );
  return `
    <table>
      <thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Tips</th><th>Method</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

export async function exportStoreIncomePDF(data, title, dateLabel) {
  const html = wrapReportHtml(title, dateLabel, storeIncomeTableHtml(data.transactions));
  const { uri } = await Print.printToFileAsync({ html });
  await shareUri(uri, 'application/pdf', 'Export PDF');
}

export async function printStoreIncomeReport(data, title, dateLabel) {
  const html = wrapReportHtml(title, dateLabel, storeIncomeTableHtml(data.transactions));
  await Print.printAsync({ html });
}

/** --- Owner advanced --- */
export async function exportOwnerAdvancedCSV(data, filename) {
  const root = await getWriteRoot();
  if (!root) {
    Alert.alert('Export', 'File storage is not available here.');
    return;
  }
  let csv = 'Name,PayType,Tickets,Revenue,Commission,Tips\n';
  (data.employees || []).forEach((e) => {
    csv += `${csvCell(e.name)},${e.payType},${e.tickets},${Number(e.revenue || 0).toFixed(2)},${Number(e.commission || 0).toFixed(2)},${Number(e.tips || 0).toFixed(2)}\n`;
  });
  const t = data.totals || {};
  csv += `TOTAL,,,${Number(t.revenue || 0).toFixed(2)},${Number(t.commission || 0).toFixed(2)},${Number(t.tips || 0).toFixed(2)}\n`;
  const path = `${root}${filename}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
  await shareUri(path, 'text/csv', 'Export report');
}

function ownerTableHtml(employees, totals) {
  const rows = (employees || []).map(
    (e) => `
    <tr>
      <td style="font-weight:600">${esc(e.name)}</td>
      <td>${esc(formatCommissionLabel(e.commissionTechPct ?? 0, e.commissionOwnerPct ?? 0))}</td>
      <td style="text-align:center">${e.tickets}</td>
      <td>$${Number(e.revenue || 0).toFixed(2)}</td>
      <td>$${Number(e.commission || 0).toFixed(2)}</td>
      <td>$${Number(e.tips || 0).toFixed(2)}</td>
    </tr>`
  );
  const t = totals || {};
  return `
    <table>
      <thead><tr><th>Name</th><th>T/C</th><th>Tickets</th><th>Revenue</th><th>Thợ share</th><th>Tips</th></tr></thead>
      <tbody>
        ${rows.join('')}
        <tr class="totals-row">
          <td colspan="3">TOTAL</td>
          <td>$${Number(t.revenue || 0).toFixed(2)}</td>
          <td>$${Number(t.commission || 0).toFixed(2)}</td>
          <td>$${Number(t.tips || 0).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>`;
}

export async function exportOwnerAdvancedPDF(data, title, dateLabel) {
  const html = wrapReportHtml(title, dateLabel, ownerTableHtml(data.employees, data.totals));
  const { uri } = await Print.printToFileAsync({ html });
  await shareUri(uri, 'application/pdf', 'Export PDF');
}

export async function printOwnerAdvancedReport(data, title, dateLabel) {
  const html = wrapReportHtml(title, dateLabel, ownerTableHtml(data.employees, data.totals));
  await Print.printAsync({ html });
}

/** --- Pedicure log --- */
export async function exportPedicureCSV(data, filename) {
  const root = await getWriteRoot();
  if (!root) {
    Alert.alert('Export', 'File storage is not available here.');
    return;
  }
  let csv = 'Date,Employee,Service,Price,Amount,Tips,Method\n';
  (data.transactions || []).forEach((t) => {
    const emp = t.Employee ? `${t.Employee.firstName || ''} ${t.Employee.lastName || ''}`.trim() : '';
    const svc = t.Service?.name || '';
    csv += `${t.date},"${String(emp).replace(/"/g, '""')}","${String(svc).replace(/"/g, '""')}",${Number(t.Service?.price || 0).toFixed(2)},${Number(t.amount || 0).toFixed(2)},${Number(t.tips || 0).toFixed(2)},${t.paymentMethod}\n`;
  });
  const path = `${root}${filename}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: 'utf8' });
  await shareUri(path, 'text/csv', 'Export report');
}

function pedicureTableHtml(transactions) {
  const rows = (transactions || []).map(
    (t) => `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${esc(t.Employee ? `${t.Employee.firstName || ''} ${t.Employee.lastName || ''}`.trim() : '')}</td>
      <td>${esc(t.Service?.name)}</td>
      <td>$${Number(t.amount || 0).toFixed(2)}</td>
      <td>$${Number(t.tips || 0).toFixed(2)}</td>
      <td>${esc(t.paymentMethod)}</td>
    </tr>`
  );
  return `
    <table>
      <thead><tr><th>Date</th><th>Tech</th><th>Service</th><th>Amount</th><th>Tips</th><th>Method</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

export async function exportPedicurePDF(data, title, dateLabel) {
  const html = wrapReportHtml(title, dateLabel, pedicureTableHtml(data.transactions));
  const { uri } = await Print.printToFileAsync({ html });
  await shareUri(uri, 'application/pdf', 'Export PDF');
}

export async function printPedicureReport(data, title, dateLabel) {
  const html = wrapReportHtml(title, dateLabel, pedicureTableHtml(data.transactions));
  await Print.printAsync({ html });
}

/** Backwards-compatible names from spec */
export const exportCSV = exportTechnicianCSV;
export const exportPDF = exportTechnicianPDF;
export const printReport = printTechnicianReport;
