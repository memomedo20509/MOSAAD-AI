const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

export interface ParsedMetaMessage {
  platform: "messenger" | "instagram";
  senderId: string;
  senderName?: string;
  recipientId: string;
  messageId: string;
  messageText: string;
  timestamp: Date;
}

export function parseMetaWebhookPayload(
  body: Record<string, unknown>
): ParsedMetaMessage[] {
  const messages: ParsedMetaMessage[] = [];
  const object = body.object as string | undefined;

  if (object !== "page" && object !== "instagram") return messages;

  const entries = body.entry as
    | { id?: string; time?: number; messaging?: unknown[] }[]
    | undefined;
  if (!Array.isArray(entries)) return messages;

  for (const entry of entries) {
    const messagingEvents = entry.messaging as
      | {
          sender?: { id?: string };
          recipient?: { id?: string };
          timestamp?: number;
          message?: { mid?: string; text?: string; is_echo?: boolean };
        }[]
      | undefined;
    if (!Array.isArray(messagingEvents)) continue;

    for (const event of messagingEvents) {
      if (!event.message || event.message.is_echo) continue;
      if (!event.message.text) continue;

      const senderId = event.sender?.id;
      const recipientId = event.recipient?.id;
      if (!senderId || !recipientId) continue;

      const platform: "messenger" | "instagram" =
        object === "instagram" ? "instagram" : "messenger";

      messages.push({
        platform,
        senderId,
        recipientId,
        messageId: event.message.mid ?? "",
        messageText: event.message.text,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      });
    }
  }

  return messages;
}

export async function sendMetaMessage(
  platform: "messenger" | "instagram",
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `${META_GRAPH_BASE}/me/messages`;

    const payload = {
      recipient: { id: recipientId },
      message: { text: messageText },
      messaging_type: "RESPONSE",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(
        `[Meta] sendMetaMessage ${platform} failed ${response.status}:`,
        errBody
      );
      return { success: false, error: errBody };
    }

    const data = (await response.json()) as {
      message_id?: string;
      recipient_id?: string;
    };
    return { success: true, messageId: data.message_id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Meta] sendMetaMessage error:`, errMsg);
    return { success: false, error: errMsg };
  }
}

export interface PageDetails {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramAccountId: string | null;
}

export async function fetchPageDetails(
  userAccessToken: string,
  pageId: string
): Promise<PageDetails | null> {
  try {
    const pagesRes = await fetch(
      `${META_GRAPH_BASE}/me/accounts`,
      { headers: { Authorization: `Bearer ${userAccessToken}` } }
    );
    if (!pagesRes.ok) return null;

    const pagesData = (await pagesRes.json()) as {
      data: { id: string; name: string; access_token: string }[];
    };
    const page = pagesData.data.find((p) => p.id === pageId);
    if (!page) return null;

    let instagramAccountId: string | null = null;
    try {
      const igRes = await fetch(
        `${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account`,
        { headers: { Authorization: `Bearer ${page.access_token}` } }
      );
      if (igRes.ok) {
        const igData = (await igRes.json()) as {
          instagram_business_account?: { id?: string };
        };
        instagramAccountId =
          igData.instagram_business_account?.id ?? null;
      }
    } catch {
      // Instagram account detection is optional
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
