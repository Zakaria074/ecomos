import { NextResponse } from "next/server";

const AD_ACCOUNTS = [
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_1,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_2,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_3,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_4,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_5,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_6,
  process.env.NEXT_PUBLIC_META_AD_ACCOUNT_7,
].filter(Boolean);

const ACCOUNT_NAMES: Record<string, string> = {
  "745840443692957": "SSST AD ACC",
  "1413439809464520": "DINO",
  "410685147751376": "Lucky account",
  "741883450881166": "WiaoxADS",
  "1712282372570163": "echri.shop",
  "537913345715869": "CHOCO",
  "1086046106163185": "108",
};

export async function GET() {
  const token = process.env.NEXT_PUBLIC_META_ACCESS_TOKEN;
  const results = await Promise.all(
    AD_ACCOUNTS.map(async (accountId) => {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/act_${accountId}?fields=balance,currency&access_token=${token}`
        );
        const data = await res.json();
        return {
          accountId,
          accountName: ACCOUNT_NAMES[accountId!] || accountId,
          balance: parseInt(data.balance || "0"),
          currency: data.currency || "USD",
        };
      } catch {
        return { accountId, accountName: ACCOUNT_NAMES[accountId!] || accountId, balance: 0, currency: "USD" };
      }
    })
  );
  return NextResponse.json(results);
}