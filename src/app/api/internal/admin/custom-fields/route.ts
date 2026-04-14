import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  entity: z.enum(["CONTACT", "LEAD", "OPPORTUNITY"]),
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, "lowercase, numbers, underscores"),
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "URL"]),
  required: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export async function POST(req: NextRequest) {
  await requireAdmin();
  const data = Body.parse(await req.json());
  const field = await db.customField.create({
    data: {
      entity: data.entity,
      key: data.key,
      label: data.label,
      type: data.type,
      required: !!data.required,
      options: data.options ?? undefined,
    },
  });
  return Response.json(field);
}
