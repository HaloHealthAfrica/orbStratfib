import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/options";

export function auth() {
  return getServerSession(getAuthOptions());
}


