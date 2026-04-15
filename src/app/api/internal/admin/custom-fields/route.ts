import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "URL"]),
  required: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  appliesTo: z
    .array(z.enum(["LEAD", "CONTACT", "OPPORTUNITY"]))
    .min(1)
    .optional(),
});

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60) || "field"
  );
}

async function uniqueKey(base: string): Promise<string> {
  let key = base;
  let i = 1;
  while (await db.customField.findUnique({ where: { key } })) {
    i += 1;
    key = `${base}_${i}`;
  }
  return key;
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const data = Body.parse(await req.json());
  const key = await uniqueKey(slugify(data.label));
  const field = await db.customField.create({
    data: {
      key,
      label: data.label,
      type: data.type,
      required: !!data.required,
      options: data.options ?? undefined,
      appliesTo: data.appliesTo ?? ["LEAD", "CONTACT", "OPPORTUNITY"],
    },
  });
  return Response.json(field);
}
