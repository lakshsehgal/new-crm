import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomSecret } from "@/lib/crypto";
import { z } from "zod";

const Body = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  await requireAdmin();
  const data = Body.parse(await req.json());
  const ep = await db.webhookEndpoint.create({
    data: {
      url: data.url,
      description: data.description ?? null,
      events: data.events as any,
      secret: randomSecret(24),
    },
  });
  return Response.json(ep);
}
