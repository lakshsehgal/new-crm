import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import CustomFieldsUI from "./CustomFieldsUI";

export const dynamic = "force-dynamic";

export default async function AdminCustomFieldsPage() {
  await requireAdmin();
  const fields = await db.customField.findMany({ orderBy: { order: "asc" } });
  return (
    <div className="p-6 space-y-4 fade-in">
      <header>
        <h1 className="text-xl font-semibold">Custom fields</h1>
        <p className="text-sm text-muted">
          Define reusable fields and choose whether they appear on Leads,
          Contacts, Opportunities, or any combination.
        </p>
      </header>
      <CustomFieldsUI
        fields={fields.map((f) => ({
          id: f.id,
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options as any,
          appliesTo: f.appliesTo as any,
        }))}
      />
    </div>
  );
}
