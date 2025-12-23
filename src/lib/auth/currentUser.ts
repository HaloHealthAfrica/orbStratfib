import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { auth } from "@/lib/auth/session";

/**
 * Resolves a user id for:
 * - authenticated sessions (preferred)
 * - single-tenant owner fallback (OWNER_USER_EMAIL)
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth().catch(() => null);
  const sessionUserId = (session as any)?.userId as string | undefined;
  if (sessionUserId) return sessionUserId;

  const env = getEnv();
  if (!env.OWNER_USER_EMAIL) throw new Error("No signed-in user and OWNER_USER_EMAIL is not set.");
  const owner = await prisma.user.findUnique({ where: { email: env.OWNER_USER_EMAIL } });
  if (!owner) throw new Error("OWNER_USER_EMAIL user not found in DB.");
  return owner.id;
}


