
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

async function getAuthenticatedUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const decoded: any = jose.decodeJwt(token);
    const userEmail = decoded?.email || decoded?.sub;
    if (!userEmail) return null;
    return await prisma.user.findUnique({ where: { email: userEmail } });
  } catch {
    return null;
  }
}


export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const wallets = await prisma.userWallet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, wallets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { address, chainId, chainName, symbol, balance, label } = await req.json();
    if (!address) return NextResponse.json({ error: "Address is required" }, { status: 400 });

    const normalizedAddress = address.toLowerCase();

    const wallet = await prisma.userWallet.upsert({
      where: {
        userId_address_chainId: {
          userId: user.id,
          address: normalizedAddress,
          chainId: chainId || 1,
        },
      },
      update: {
        chainName: chainName || "Ethereum",
        symbol: symbol || "ETH",
        balance: parseFloat(balance || "0"),
        lastSynced: new Date(),
        ...(label ? { label } : {}),
      },
      create: {
        userId: user.id,
        address: normalizedAddress,
        chainId: chainId || 1,
        chainName: chainName || "Ethereum",
        symbol: symbol || "ETH",
        balance: parseFloat(balance || "0"),
        label: label || `Wallet (${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)})`,
        lastSynced: new Date(),
      },
    });

    return NextResponse.json({ success: true, wallet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    await prisma.userWallet.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true, message: "Wallet unlinked" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}