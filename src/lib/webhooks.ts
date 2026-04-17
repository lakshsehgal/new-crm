import { after } from "next/server";
import { db } from "@/lib/db";
import { hmacSign } from "@/lib/crypto";
import type { WebhookEvent } from "@prisma/client";

/**
 * Schedule a webhook dispatch to run after the current response is sent.
 *
 * Uses Next.js `after()` so the Vercel serverless function stays alive until
 * the outbound fetch completes. Plain `void dispatchWebhook(...)` looks fine
 * in dev but gets killed on Vercel — the function freezes when the response
 * returns, aborting the TLS handshake and causing ECONNRESET against
 * hooks.zapier.com / hooks.slack.com / etc.
 *
 * Use this inside Next.js route handlers. Plain `dispatchWebhook` can still
 * be used when you want to await completion (e.g. during a test endpoint).
 */
export function dispatchWebhookAfter(event: WebhookEvent, payload: unknown): void {
  after(async () => {
    try {
      await dispatchWebhook(event, payload);
    } catch (err) {
      console.error(`[webhook] dispatch ${event} failed:`, err);
    }
  });
}

/**
 * Fan-out a webhook event to all active subscribed endpoints.
 * Sent as fire-and-forget background work; failures are logged in WebhookDelivery.
 */
export async function dispatchWebhook(event: WebhookEvent, payload: unknown) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { active: true, events: { has: event } },
  });
  if (endpoints.length === 0) return;

  const envelope = {
    id: crypto.randomUUID(),
    event,
    created_at: new Date().toISOString(),
    data: payload,
  };
  const body = JSON.stringify(envelope);

  await Promise.allSettled(
    endpoints.map(async (ep) => {
      const signature = hmacSign(body, ep.secret);
      const delivery = await db.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          event,
          payload: envelope as any,
        },
      });
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-crm-event": event,
            "x-crm-delivery": delivery.id,
            "x-crm-signature": `sha256=${signature}`,
            "user-agent": "new-crm-webhooks/1.0",
          },
          body,
        });
        const text = await res.text().catch(() => "");
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: res.status,
            responseBody: text.slice(0, 4000),
            deliveredAt: new Date(),
          },
        });
      } catch (err: any) {
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: { error: String(err?.message ?? err).slice(0, 2000) },
        });
      }
    }),
  );
}
