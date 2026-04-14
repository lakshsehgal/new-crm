import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import CustomFieldsUI from "./CustomFieldsUI";

export const dynamic = "force-dynamic";

export default async function AdminCustomFieldsPage() {
  await requireAdmin();
  const fields = await db.customField.findMany({ orderBy: [{ entity: "asc" }, { order: "asc" }] });
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Custom fields</h1>
        <p className="text-sm text-muted">Add fields to contacts, leads, or opportunities.</p>
      </header>
      <CustomFieldsUI
        fields={fields.map((f) => ({
          id: f.id,
          entity: f.entity,
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options as any,
        }))}
      />
    </div>
  );
}
