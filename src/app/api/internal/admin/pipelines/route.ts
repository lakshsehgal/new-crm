import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1) });

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { name } = Body.parse(await req.json());
  const p = await db.pipeline.create({ data: { name } });
  return Response.json(p);
}
