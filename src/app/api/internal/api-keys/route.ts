import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/crypto";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1).max(60) });

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { name } = Body.parse(await req.json());
  const { plaintext, prefix, hash } = generateApiKey();
  await db.apiKey.create({
    data: { name, prefix, hash, userId: user.id },
  });
  return Response.json({ plaintext, prefix });
}
