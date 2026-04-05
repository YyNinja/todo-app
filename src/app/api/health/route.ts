import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", ...checks },
    { status: healthy ? 200 : 503 }
  );
}
