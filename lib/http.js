import { NextResponse } from "next/server";

export function ok(data) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

export function fail(status, code, message, fields) {
  return NextResponse.json(
    { ok: false, error: { code, message, fields: fields || {} } },
    { status }
  );
}
