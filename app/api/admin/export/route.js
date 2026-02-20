import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import ExcelJS from "exceljs";

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const newRow = {};
    for (const key of Object.keys(row)) {
      const value = row[key];

      // Convert JSON objects to readable strings for Excel
      if (value && typeof value === "object") {
        newRow[key] = JSON.stringify(value);
      } else {
        newRow[key] = value;
      }
    }
    return newRow;
  });
}

async function addSheet(workbook, name, rows) {
  const ws = workbook.addWorksheet(name);

  if (!rows || rows.length === 0) {
    ws.addRow(["(no rows)"]);
    return;
  }

  const headers = Object.keys(rows[0]);
  ws.addRow(headers);

  for (const r of rows) {
    ws.addRow(headers.map((h) => r[h]));
  }

  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 22));
}

export async function GET(req) {
  const auth = requireAdmin(req);
  if (!auth.ok)
    return Response.json({ error: auth.message }, { status: auth.status });

  const pool = getPool();

  const [
    customers,
    licenses,
    wallets,
    ledger,
    aiRequests
  ] = await Promise.all([
    pool.query("select * from customers order by created_at desc"),
    pool.query("select * from licenses order by created_at desc"),
    pool.query("select * from wallets order by updated_at desc"),
    pool.query("select * from ledger order by created_at desc"),
    pool.query("select * from ai_requests order by created_at desc"),
  ]);

  const wb = new ExcelJS.Workbook();

  await addSheet(wb, "customers", customers.rows);
  await addSheet(wb, "licenses", licenses.rows);
  await addSheet(wb, "wallets", wallets.rows);
  await addSheet(wb, "ledger", normalizeRows(ledger.rows));
  await addSheet(wb, "ai_requests", normalizeRows(aiRequests.rows));

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `optisheets_admin_export_${ts()}.xlsx`;

  return new Response(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
