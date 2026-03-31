const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

export type MetaPlatform = "messenger" | "instagram";

export interface MetaIncomingMessage {
  senderId: string;
  recipientId: string;
  messageText: string;
  messageId: string;
  timestamp: Date;
  platform: MetaPlatform;
  senderName?: string;
}

type IncomingMetaHandler = (msg: MetaIncomingMessage) => Promise<void>;

let incomingMetaHandler: IncomingMetaHandler | null = null;

export function setIncomingMetaHandler(handler: IncomingMetaHandler): void {
  incomingMetaHandler = handler;
}

export async function getIncomingMetaHandler(): Promise<IncomingMetaHandler | null> {
  return incomingMetaHandler;
}

export async function sendMetaMessage(
  platform: MetaPlatform,
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const endpoint = `${META_GRAPH_BASE}/me/messages`;

    const body = {
      recipient: { id: recipientId },
      message: { text: messageText },
      messaging_type: "RESPONSE",
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Meta] Send message error (${platform}) ${response.status}: ${errText}`);
      return { success: false, error: `${response.status}: ${errText}` };
    }

    const data = (await response.json()) as { message_id?: string };
    return { success: true, messageId: data.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Meta] sendMetaMessage exception:`, msg);
    return { success: false, error: msg };
  }
}

export async function fetchPageDetails(
  userAccessToken: string,
  pageId: string
): Promise<{ pageId: string; pageName: string; pageAccessToken: string; instagramAccountId?: string } | null> {
  try {
    const pagesRes = await fetch(
      `${META_GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`
    );
    if (!pagesRes.ok) return null;
    const pagesData = (await pagesRes.json()) as { data: { id: string; name: string; access_token: string }[] };
    const page = pagesData.data.find((p) => p.id === pageId);
    if (!page) return null;

    let instagramAccountId: string | undefined;
    try {
      const igRes = await fetch(
        `${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      if (igRes.ok) {
        const igData = (await igRes.json()) as { instagram_business_account?: { id: string } };
        instagramAccountId = igData.instagram_business_account?.id;
      }
    } catch {
    }

    return {
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      instagramAccountId,
    };
  } catch (err) {
    console.error("[Meta] fetchPageDetails error:", err);
    return null;
  }
}

export function parseMetaWebhookPayload(
  body: Record<string, unknown>
): MetaIncomingMessage[] {
  const results: MetaIncomingMessage[] = [];
  try {
    const object = body.object as string;
    const entries = body.entry as Record<string, unknown>[];
    if (!Array.isArray(entries)) return results;

    for (const entry of entries) {
      const messaging = entry.messaging as Record<string, unknown>[] | undefined;
      const changes = entry.changes as Record<string, unknown>[] | undefined;

      if (Array.isArray(messaging)) {
        for (const event of messaging) {
          const message = event.message as Record<string, unknown> | undefined;
          if (!message || message.is_echo) continue;
          const sender = (event.sender as { id: string } | undefined)?.id;
          const recipient = (event.recipient as { id: string } | undefined)?.id;
          const text = message.text as string | undefined;
          const mid = message.mid as string | undefined;
          const rawTs = typeof event.timestamp === "number" ? event.timestamp : Date.now() / 1000;
          // Meta Messenger sends Unix timestamps in seconds; multiply by 1000 for ms
          // Guard: if value already looks like ms (> year 2100 in seconds), use as-is
          const tsMs = rawTs > 4_000_000_000 ? rawTs : rawTs * 1000;

          if (!sender || !text) continue;

          results.push({
            senderId: sender,
            recipientId: recipient ?? "",
            messageText: text,
            messageId: mid ?? "",
            timestamp: new Date(tsMs),
            platform: object === "instagram" ? "instagram" : "messenger",
          });
        }
      } else if (Array.isArray(changes)) {
        for (const change of changes) {
          if (change.field !== "messages") continue;
          const value = change.value as Record<string, unknown> | undefined;
          if (!value) continue;
          const messages = value.messages as Record<string, unknown>[] | undefined;
          if (!Array.isArray(messages)) continue;

          for (const msg of messages) {
            if (msg.type !== "text") continue;
            const from = (msg.from as { id: string } | undefined)?.id;
            const text = (msg.text as { body: string } | undefined)?.body;
            const mid = msg.id as string | undefined;
            const rawTs = typeof msg.timestamp === "string" ? parseInt(msg.timestamp) : (typeof msg.timestamp === "number" ? msg.timestamp : Date.now() / 1000);
            // Meta sends Unix timestamps in seconds; guard against already-ms values
            const tsMs = rawTs > 4_000_000_000 ? rawTs : rawTs * 1000;
            if (!from || !text) continue;
            results.push({
              senderId: from,
              recipientId: "",
              messageText: text,
              messageId: mid ?? "",
              timestamp: new Date(tsMs),
              platform: "instagram",
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[Meta] parseMetaWebhookPayload error:", err);
  }
  return results;
}
