import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  folder: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

export async function GET() {
  const user = await requireUser();
  const bookmarks = await db.bookmark.findMany({
    where: { ownerId: user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(bookmarks);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const data = Body.parse(await req.json());
  const count = await db.bookmark.count({ where: { ownerId: user.id } });
  const bookmark = await db.bookmark.create({
    data: {
      title: data.title.trim(),
      url: data.url.trim(),
      folder: data.folder?.trim() || null,
      order: data.order ?? count,
      ownerId: user.id,
    },
  });
  return Response.json(bookmark, { status: 201 });
}
