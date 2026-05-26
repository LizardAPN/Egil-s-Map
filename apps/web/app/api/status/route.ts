import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Imprint",
    status: "ok",
    surface: "web",
    timestamp: new Date().toISOString()
  });
}
