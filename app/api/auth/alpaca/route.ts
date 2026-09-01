import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  const alpacaKey = process.env.ALPACA_API_KEY || process.env.NEXT_PUBLIC_ALPACA_KEY;
  const alpacaSecret = process.env.ALPACA_API_SECRET || process.env.NEXT_PUBLIC_ALPACA_SECRET;

  if (!symbols) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  try {
    const snapRes = await fetch(
      `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols}&feed=iex`,
      {
        headers: {
          "APCA-API-KEY-ID": alpacaKey || "",
          "APCA-API-SECRET-KEY": alpacaSecret || "",
        },
        cache: "no-store",
      }
    );

    const snapData = await snapRes.json();
    return NextResponse.json(snapData);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch Alpaca data" }, { status: 500 });
  }
}