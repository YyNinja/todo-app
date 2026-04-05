import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function createTRPCContext(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  return {
    db,
    session,
    userId: session?.user?.id ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
