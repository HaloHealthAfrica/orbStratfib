"use server";

import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/currentUser";

function normalizeSymbol(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

export async function createWatchlistAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Watchlist name required.");
  await prisma.watchlist.create({ data: { userId, name } });
}

export async function addSymbolAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const symbol = normalizeSymbol(String(formData.get("symbol") ?? ""));
  if (!watchlistId) throw new Error("Missing watchlistId.");
  if (!symbol) throw new Error("Symbol required.");

  const wl = await prisma.watchlist.findFirst({ where: { id: watchlistId, userId } });
  if (!wl) throw new Error("Watchlist not found.");

  await prisma.watchlistItem.create({ data: { watchlistId, symbol } });
  await prisma.watchlist.update({ where: { id: watchlistId }, data: { updatedAt: new Date() } });
}

export async function toggleWatchlistItemAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) throw new Error("Missing itemId.");

  const item = await prisma.watchlistItem.findUnique({ where: { id: itemId }, include: { watchlist: true } });
  if (!item || item.watchlist.userId !== userId) throw new Error("Not found.");

  await prisma.watchlistItem.update({ where: { id: itemId }, data: { enabled: !item.enabled } });
  await prisma.watchlist.update({ where: { id: item.watchlistId }, data: { updatedAt: new Date() } });
}

export async function deleteWatchlistItemAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) throw new Error("Missing itemId.");

  const item = await prisma.watchlistItem.findUnique({ where: { id: itemId }, include: { watchlist: true } });
  if (!item || item.watchlist.userId !== userId) throw new Error("Not found.");

  await prisma.watchlistItem.delete({ where: { id: itemId } });
  await prisma.watchlist.update({ where: { id: item.watchlistId }, data: { updatedAt: new Date() } });
}


