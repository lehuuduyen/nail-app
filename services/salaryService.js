import * as Print from 'expo-print';
import Constants from 'expo-constants';
import api from '../api/client';
import { addDaysYmd } from '../utils/ymdLocal';
import { buildWeekRowsDescending, formatWeekRangeLabel } from '../utils/reportWeekList';

/** Weekly periods (Mon–Sun), newest first — same labels as Reports “Pick a week”. */
export function generateWeeklyPeriods(count = 52) {
  return buildWeekRowsDescending(count).map((r) => ({
    label: r.label,
    startDate: r.weekStartYmd,
    endDate: addDaysYmd(r.weekStartYmd, 6),
  }));
}

export async function calculateSalary(startDate, endDate, employeeId = null) {
  const params = { startDate, endDate };
  if (employeeId != null) params.employeeId = employeeId;
  const { data } = await api.get('/api/salary/calculate', { params });
  return data;
}

export async function saveSalaryRecord(body) {
  const { data } = await api.post('/api/salary/save', body);
  return data;
}

export async function updateSalaryRecord(id, updates) {
  const { data } = await api.put(`/api/salary/${id}`, updates);
  return data;
}

export async function getSalaryHistory(startDate, endDate) {
  const { data } = await api.get('/api/salary/history', {
    params: { startDate, endDate },
  });
  return data;
}

export async function fetchEmployeesList() {
  const { data } = await api.get('/api/employees');
  return Array.isArray(data) ? data : [];
}

export async function updateEmployee(id, body) {
  const { data } = await api.put(`/api/employees/${id}`, body);
  return data;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateSalaryHTML(employees, periodLabel, totals = null, shopSummary = null) {
  const shopBlock =
    shopSummary && typeof shopSummary === 'object'
      ? `
      <div style="margin:12px 0;padding:10px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;font-size:10px;line-height:1.45;">
        <div style="font-weight:bold;color:#1b5e20;margin-bottom:6px;">TIỆM — KỲ NÀY</div>
        <div>Doanh thu dịch vụ (không tip): $${Number(shopSummary.serviceRevenueTotal || 0).toFixed(2)} · Tip trả thợ: $${Number(shopSummary.tipsToStaff || 0).toFixed(2)}</div>
        <div>Tổng trả nhân viên: $${Number(shopSummary.staffTotalPay || 0).toFixed(2)}</div>
        ${
          Number(shopSummary.minPaySubsidyTotal || 0) > 0.005
            ? `<div>Phần chủ (trước bù bao lương): $${Number(shopSummary.ownerSplitGrossTotal || 0).toFixed(2)} · Bù bao lương / trả thêm: ($${Number(shopSummary.minPaySubsidyTotal || 0).toFixed(2)})</div>`
            : ''
        }
        <div style="font-weight:bold;margin-top:8px;color:${Number(shopSummary.ownerNetProfitTotal || 0) < 0 ? '#c62828' : '#2e7d32'}">Lời chủ (sau bù): $${Number(shopSummary.ownerNetProfitTotal || 0).toFixed(2)}</div>
      </div>`
      : '';

  const rows = (employees || [])
    .map((e) => {
      const bc =
        typeof e.bonusCheck === 'string'
          ? esc(e.bonusCheck)
          : Number(e.bonusCheck || 0).toFixed(2);
      const cash = Number(e.cash ?? e.bonusDue ?? 0).toFixed(2);
      const chk = Number(e.check ?? e.checkDue ?? 0).toFixed(2);
      return `
    <tr>
      <td>${esc(e.name)}</td>
      <td>${esc(e.commSplitLabel || '—')}</td>
      <td>${bc}</td>
      <td>$${Number(e.totalSales || 0).toFixed(2)}</td>
      <td>$${Number(e.totalTips || 0).toFixed(2)}</td>
      <td>$${Number(e.commission || 0).toFixed(2)}</td>
      <td>($${Number(e.tipCredit || 0).toFixed(2)})</td>
      <td>($${Number(e.cleanFee || 0).toFixed(2)})</td>
      <td>$${Number(e.totalPay || 0).toFixed(2)}</td>
      <td>$${cash}</td>
      <td>$${chk}</td>
      <td>$${Number(e.profit || 0).toFixed(2)}</td>
    </tr>`;
    })
    .join('');

  const totalRow = totals
    ? `
    <tr style="background:#c8e6c9;font-weight:bold">
      <td>TOTAL</td>
      <td></td><td></td>
      <td>$${Number(totals.totalSales || 0).toFixed(2)}</td>
      <td>$${Number(totals.totalTips || 0).toFixed(2)}</td>
      <td>$${Number(totals.commission || 0).toFixed(2)}</td>
      <td>($${Number(totals.tipCredit || 0).toFixed(2)})</td>
      <td>($${Number(totals.cleanFee || 0).toFixed(2)})</td>
      <td>$${Number(totals.totalPay || 0).toFixed(2)}</td>
      <td>$${Number(totals.cash ?? totals.bonusDue ?? 0).toFixed(2)}</td>
      <td>$${Number(totals.check ?? totals.checkDue ?? 0).toFixed(2)}</td>
      <td>$${Number(totals.profit || 0).toFixed(2)}</td>
    </tr>
  `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 16px; }
        .header { text-align: center; margin-bottom: 16px; }
        .salon { font-size: 18px; font-weight: bold; color: #1a1a2e; }
        .period { font-size: 13px; color: #555; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th {
          background: #1a1a2e; color: white;
          padding: 6px 4px; font-size: 10px;
          text-align: center; border: 1px solid #333;
        }
        td {
          padding: 5px 4px; border: 1px solid #ddd;
          text-align: right; font-size: 10px;
        }
        td:first-child { text-align: left; font-weight: 600; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="salon">l</div>
        <div class="period">SALARY REPORT</div>
        <div class="period">${esc(periodLabel)}</div>
        <div class="period">Generated: ${esc(new Date().toLocaleString())}</div>
      </div>
      ${shopBlock}
      <table>
        <thead>
          <tr>
            <th>Name</th><th>T/C</th><th>C/C</th>
            <th>Total Sales</th><th>Total Tip</th><th>Commission</th>
            <th>Tip Credit</th><th>Clean Fee</th><th>Total Pay</th>
            <th>Cash</th><th>Check</th><th>Profit (chủ)</th>
          </tr>
        </thead>
        <tbody>${rows}${totalRow}</tbody>
      </table>
      <div class="footer">
        Nice Nails & Spa • 8048 N 19th Ave, Phoenix AZ 85021 • (602) 759-9184
      </div>
    </body>
    </html>
  `;
}

export async function printEmployeeSalary(employeeData, periodLabel) {
  const html = generateSalaryHTML([employeeData], periodLabel, null);
  await Print.printAsync({ html });
}

function salaryStatementFromEmail() {
  return (
    process.env.EXPO_PUBLIC_SALARY_FROM_EMAIL ||
    Constants.expoConfig?.extra?.salaryFromEmail ||
    ''
  );
}

function statementRangeParts(period) {
  if (!period?.startDate) {
    return { start: '', end: '', rangeLine: period?.label || '' };
  }
  const rangeLine = formatWeekRangeLabel(period.startDate);
  const parts = rangeLine.split(/\s+to\s+/i);
  if (parts.length >= 2) {
    return { start: parts[0].trim(), end: parts[1].trim(), rangeLine };
  }
  return { start: '', end: '', rangeLine: period.label || rangeLine };
}

function tipPayInWord(cashPortionPct) {
  const c = Number(cashPortionPct ?? 50);
  if (!Number.isFinite(c)) return 'MIX';
  if (c <= 0) return 'CHECK';
  if (c >= 100) return 'CASH';
  return 'MIX';
}

function normalizePayrollStatusPrint(s) {
  const v = String(s ?? 'draft')
    .trim()
    .toLowerCase();
  return v === 'paid' ? 'paid' : 'draft';
}

/**
 * Bản in / xem trước kiểu email: SALARY … from … To … + chi tiết dòng (theo màn hình POS).
 * @param {{ empRow: object, employee: object, period: { startDate, endDate, label? } }} p
 */
export function generateSalaryStatementHTML({ empRow, employee, period }) {
  const { start, end, rangeLine } = statementRangeParts(period);
  const shortTitle = esc((employee?.firstName || '').trim().toUpperCase() || 'STAFF');
  const fullNameRaw =
    `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || String(empRow?.name || 'Employee');
  const fullName = esc(fullNameRaw);
  const headerSubject = `SALARY ${shortTitle} from ${esc(start)} To ${esc(end)}`;
  const bodyHeading = `SALARY ${fullName} FOR PERIOD FROM ${esc(start)} To ${esc(end)}`;
  const fromAddr = esc(salaryStatementFromEmail());

  const sales = Number(empRow?.totalSales || 0).toFixed(2);
  const tips = Number(empRow?.totalTips || 0).toFixed(2);
  const commission = Number(empRow?.commission || 0).toFixed(2);
  const tipCredit = Number(empRow?.tipCredit || 0).toFixed(2);
  const totalPay = Number(empRow?.totalPay || 0).toFixed(2);
  const minPay = Number(empRow?.minimumPay ?? employee?.minimumPay ?? 0).toFixed(2);
  const paidSettled = normalizePayrollStatusPrint(empRow?.payrollStatus) === 'paid';
  const minPayStatusLine = paidSettled ? 'APPLIED' : 'NOT APPLIED';
  const tipPayIn = tipPayInWord(employee?.cashPortionPct);
  const cash = Number(empRow?.cash ?? empRow?.bonusDue ?? 0).toFixed(2);
  const check = Number(empRow?.check ?? empRow?.checkDue ?? 0).toFixed(2);
  const chk = Number(empRow?.check ?? empRow?.checkDue ?? 0);
  const tipN = Number(empRow?.totalTips || 0);
  const checkBeforeTip = Math.max(0, chk - tipN).toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 14px; color: #111; padding: 20px; max-width: 640px; margin: 0 auto; background: #fff; }
    .window-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; line-height: 1.35; }
    .row { margin: 4px 0; font-size: 13px; color: #333; }
    .label { color: #555; }
    .body-block { margin-top: 20px; padding-top: 12px; border-top: 1px solid #ddd; }
    .body-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; }
    .line { margin: 8px 0; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="window-title">${headerSubject}</div>
  <div class="row"><span class="label">To:</span></div>
  <div class="row"><span class="label">Cc/Bcc, From:</span> ${fromAddr || '&nbsp;'}</div>
  <div class="row"><span class="label">Subject:</span> ${headerSubject}</div>

  <div class="body-block">
    <div class="body-title">${bodyHeading}</div>
    <div class="line">Sales: $${sales}</div>
    <div class="line">Tip: $${tips}</div>
    <div class="line">Commission: $${commission}</div>
    <div class="line">Tip Credit: ($${tipCredit})</div>
    <div class="line">Total Pay: $${totalPay}</div>
    <div class="line">Minimum Pay: $${minPay}</div>
    <div class="line">Minimum Pay Status: ${minPayStatusLine}</div>
    <div class="line">Tip Pay In: ${tipPayIn}</div>
    <div class="line">Cash: $${cash}</div>
    <div class="line">Check: $${check}</div>
    <div class="line">Check Before Tip: $${checkBeforeTip}</div>
  </div>
  <div class="row" style="margin-top:20px;font-size:11px;color:#888;">${esc(rangeLine)}</div>
</body>
</html>`;
}

export async function printSalaryStatement(payload) {
  const html = generateSalaryStatementHTML(payload);
  await Print.printAsync({ html });
}

export async function printAllSalaries(employees, totals, periodLabel, shopSummary = null) {
  const html = generateSalaryHTML(employees, periodLabel, totals, shopSummary);
  await Print.printAsync({ html });
}
