import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { points } = await req.json();
    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: "'points' must be a non-empty array" }, { status: 400 });
    }

    const base = "https://gesture-model.pikaisso.com";
    const resp = await fetch(`${base}/predict_json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
      cache: "no-store",
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON from gesture service" }, { status: 502 });
    }

    if (!resp.ok) {
      return NextResponse.json({ error: data?.detail || "Gesture service error" }, { status: resp.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}


