import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import SmartViewEditor from "./SmartViewEditor";

export const dynamic = "force-dynamic";

export default async function SmartViewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // "new" is a special route for creating a new view
  if (id === "new") {
    const customFields = await db.customField.findMany({
      where: { appliesTo: { has: "LEAD" } },
      orderBy: { order: "asc" },
    });
    return (
      <SmartViewEditor
        view={null}
        customFields={customFields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          options: f.options,
        }))}
      />
    );
  }

  const view = await db.smartView.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!view) notFound();

  const entity = (view.entity as string) ?? "LEAD";
  const customFields = await db.customField.findMany({
    where: { appliesTo: { has: entity === "LEAD" ? "LEAD" : "OPPORTUNITY" } },
    orderBy: { order: "asc" },
  });

  return (
    <SmartViewEditor
      view={{
        id: view.id,
        name: view.name,
        entity: view.entity,
        filters: view.filters as any,
        pinned: view.pinned,
      }}
      customFields={customFields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        options: f.options,
      }))}
    />
  );
}
