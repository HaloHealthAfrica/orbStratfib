import { prisma } from "@/lib/db";
import { TradierClient } from "@/lib/providers/tradier";
import { getEnv, requireEnv } from "@/lib/env";

export async function createPaperTrade(params: {
  userId: string;
  signalId: string;
  symbol: string;
  optionSym: string;
  side: "BUY_CALL" | "BUY_PUT";
  qty: number;
  midPrice: number;
  audit: any;
}) {
  const trade = await prisma.trade.create({
    data: {
      userId: params.userId,
      signalId: params.signalId,
      mode: "PAPER",
      symbol: params.symbol,
      optionSym: params.optionSym,
      side: params.side,
      qty: params.qty,
      entryPrice: params.midPrice,
      status: "OPEN",
      auditLog: params.audit,
      orders: {
        create: {
          broker: "paper",
          status: "FILLED",
          type: "MARKET",
          qty: params.qty,
          limitPrice: null,
          raw: { fill: "mid", midPrice: params.midPrice },
        },
      },
      fills: {
        create: {
          qty: params.qty,
          price: params.midPrice,
          raw: { paper: true },
        },
      },
    },
    include: { orders: true, fills: true },
  });
  return trade;
}

export async function createLiveTradeViaTradier(params: {
  userId: string;
  signalId: string;
  symbol: string;
  optionSym: string;
  side: "BUY_CALL" | "BUY_PUT";
  qty: number;
  audit: any;
}) {
  const env = getEnv();
  const accountId = env.TRADIER_ACCOUNT_ID ?? requireEnv("TRADIER_ACCOUNT_ID");
  const tradier = new TradierClient();

  const brokerSide = params.side === "BUY_CALL" || params.side === "BUY_PUT" ? "buy_to_open" : "buy_to_open";
  const brokerResp = await tradier.placeOrder({
    accountId,
    class: "option",
    symbol: params.optionSym,
    side: brokerSide,
    quantity: params.qty,
    type: "market",
    tag: `miyagi:${params.signalId}`,
  });

  const trade = await prisma.trade.create({
    data: {
      userId: params.userId,
      signalId: params.signalId,
      mode: "LIVE",
      symbol: params.symbol,
      optionSym: params.optionSym,
      side: params.side,
      qty: params.qty,
      status: "OPEN",
      auditLog: params.audit,
      orders: {
        create: {
          broker: "tradier",
          status: "SUBMITTED",
          type: "MARKET",
          qty: params.qty,
          raw: brokerResp,
        },
      },
    },
    include: { orders: true },
  });

  return trade;
}


