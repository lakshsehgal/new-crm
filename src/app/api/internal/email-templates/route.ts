import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function GET() {
  await requireUser();
  const templates = await db.emailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ data: templates });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const template = await db.emailTemplate.create({
    data: { ...data, createdBy: user.id },
  });
  return Response.json(template);
}
