// app/api/recommendations/route.js
import { NextResponse } from "next/server";
import { getTemplateHandler } from "@/lib/templates";

export async function POST(req) {
  try {
    const body = await req.json();

    // 1) Basic validation (Part 4 level)
    const licenseKey = body.license_key;
    const templateId = body.template_id;
    const requestType = body.request_type;

    if (!licenseKey) {
      return NextResponse.json(
        { error: "Missing license_key" },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { error: "Missing template_id" },
        { status: 400 }
      );
    }

    if (requestType !== "recommendations") {
      return NextResponse.json(
        { error: "Invalid request_type. Must be 'recommendations'." },
        { status: 400 }
      );
    }

    // 2) Pick the correct template handler
    const handler = getTemplateHandler(templateId);
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown template_id: ${templateId}` },
        { status: 400 }
      );
    }

    // 3) Run the template logic (fake AI for now)
    const result = await handler(body);

    // 4) Return the result in the exact structure your Apps Script expects
    return NextResponse.json(result, { status: 200 });

  } catch (err) {
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// Optional: if you want a quick GET test in browser
export async function GET() {
  return NextResponse.json(
    { ok: true, message: "Use POST to /api/recommendations" },
    { status: 200 }
  );
}
