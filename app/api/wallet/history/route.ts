import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawAddressParam = searchParams.get("addresses") || searchParams.get("address");

  if (!rawAddressParam) {
    return NextResponse.json({ error: "No wallet address provided" }, { status: 400 });
  }

  const apiKey = process.env.ETHERSCAN_API_KEY || "";
  const addresses = rawAddressParam
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  try {
    const allResults = await Promise.all(
      addresses.map(async (address) => {
        try {
          // UPDATED: Using Etherscan API V2 with chainid=11155111 for Sepolia
          const res = await fetch(
            `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc&apikey=${apiKey}`,
            { cache: "no-store" }
          );
          const data = await res.json();

          if (data.status !== "1" && data.message !== "No transactions found") {
            console.error(`Etherscan API V2 Error for ${address}:`, data);
            return [];
          }

          return (data.result || []).map((tx: any) => {
            const isReceive = tx.to?.toLowerCase() === address;
            const ethValue = parseFloat(tx.value) / 1e18;

            return {
              id: tx.hash,
              timestamp: parseInt(tx.timeStamp) * 1000,
              symbol: "SEP ETH",
              action: isReceive ? "WEB3_RECEIVE" : "WEB3_SEND",
              shares: ethValue,
              price: 0,
              total: ethValue,
              isWeb3: true,
              walletAddress: address,
              explorerUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
            };
          });
        } catch (err) {
          console.error(`Failed to fetch history for ${address}:`, err);
          return [];
        }
      })
    );

    const txMap = new Map();
    allResults.flat().forEach((tx) => {
      if (!txMap.has(tx.id)) {
        txMap.set(tx.id, tx);
      }
    });

    return NextResponse.json({ success: true, transactions: Array.from(txMap.values()) });
  } catch (error: any) {
    console.error("Multi-wallet history sync failed:", error);
    return NextResponse.json({ error: "Failed to fetch on-chain history" }, { status: 500 });
  }
}