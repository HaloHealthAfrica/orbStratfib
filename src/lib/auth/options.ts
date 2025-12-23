import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export function getAuthOptions(): NextAuthOptions {
  const env = getEnv();

  const providers = [];
  if (env.GITHUB_ID && env.GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: env.GITHUB_ID,
        clientSecret: env.GITHUB_SECRET,
      })
    );
  }

  return {
    adapter: PrismaAdapter(prisma),
    providers,
    session: { strategy: "database" },
    pages: { signIn: "/signin" },
    callbacks: {
      async session({ session, user }) {
        // Expose user id for server actions / routing.
        (session as any).userId = user.id;
        return session;
      },
    },
  };
}


