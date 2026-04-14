import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import ApiKeysUI from "./ApiKeysUI";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await auth();
  const userId = (session?.user as any).id;
  const keys = await db.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">API keys</h1>
        <p className="text-sm text-muted">
          Use API keys with <code>Authorization: Bearer &lt;key&gt;</code> to call the REST API at
          <code className="ml-1">/api/v1/*</code>. Safe to use from n8n and Zapier.
        </p>
      </header>
      <ApiKeysUI
        keys={keys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          revokedAt: k.revokedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
