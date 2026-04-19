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

export interface ParsedMetaComment {
  platform: "messenger" | "instagram";
  entryId: string;
  commentId: string;
  postId: string;
  commenterId: string;
  commentText: string;
  timestamp: Date;
}

export function parseMetaCommentPayload(
  body: Record<string, unknown>
): ParsedMetaComment[] {
  const comments: ParsedMetaComment[] = [];
  const object = body.object as string | undefined;

  if (object !== "page" && object !== "instagram") return comments;

  const entries = body.entry as
    | { id?: string; time?: number; changes?: { field?: string; value?: Record<string, unknown> }[] }[]
    | undefined;
  if (!Array.isArray(entries)) return comments;

  for (const entry of entries) {
    const entryId = entry.id ?? "";
    if (!Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (change.field !== "feed" && change.field !== "comments") continue;
      const val = change.value;
      if (!val) continue;

      const platform: "messenger" | "instagram" = object === "instagram" ? "instagram" : "messenger";

      // ── Instagram `comments` webhook format ──────────────────────────────────
      // field === "comments", value has: id, text, from.id, media.id
      if (change.field === "comments" && object === "instagram") {
        const commentId = val.id as string | undefined;
        const fromObj = val.from as Record<string, unknown> | undefined;
        const senderId = fromObj?.id as string | undefined;
        const mediaObj = val.media as Record<string, unknown> | undefined;
        const postId = (mediaObj?.id as string | undefined) ?? commentId ?? "";
        const commentText = val.text as string | undefined;

        if (!commentId || !senderId) continue;

        comments.push({
          platform: "instagram",
          entryId,
          commentId,
          postId,
          commenterId: senderId,
          commentText: commentText ?? "",
          timestamp: new Date(),
        });
        continue;
      }

      // ── Facebook `feed` webhook format ───────────────────────────────────────
      // field === "feed", value has: item, verb, comment_id, post_id, sender_id, message, created_time
      const item = val.item as string | undefined;
      const verb = val.verb as string | undefined;
      if (item !== "comment" || verb !== "add") continue;

      const commentId = val.comment_id as string | undefined;
      const postId = (val.post_id as string | undefined) ?? (val.parent_id as string | undefined);
      const senderId = (val.sender_id as string | undefined) ?? ((val.from as Record<string, unknown> | undefined)?.id as string | undefined);
      const commentText = val.message as string | undefined;
      const timestamp = val.created_time as number | undefined;

      if (!commentId || !postId || !senderId) continue;

      comments.push({
        platform,
        entryId,
        commentId,
        postId,
        commenterId: senderId,
        commentText: commentText ?? "",
        timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
      });
    }
  }

  return comments;
}

export async function replyToComment(
  commentId: string,
  replyText: string,
  pageAccessToken: string,
  platform: "messenger" | "instagram" = "messenger"
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    // Facebook: POST /{comment-id}/comments
    // Instagram: POST /{ig-comment-id}/replies
    const endpoint = platform === "instagram" ? "replies" : "comments";
    const url = `${META_GRAPH_BASE}/${commentId}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify({ message: replyText }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[Meta] replyToComment (${platform}) failed ${response.status}:`, errBody);
      return { success: false, error: errBody };
    }

    const data = (await response.json()) as { id?: string };
    return { success: true, commentId: data.id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Meta] replyToComment error:`, errMsg);
    return { success: false, error: errMsg };
  }
}

export async function subscribePageToWebhook(
  pageId: string,
  pageAccessToken: string,
  extraFields: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseFields = ["messages", "messaging_postbacks", "feed"];
    const fields = Array.from(new Set([...baseFields, ...extraFields])).join(",");
    const url = `${META_GRAPH_BASE}/${pageId}/subscribed_apps?subscribed_fields=${fields}&access_token=${pageAccessToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn(`[Meta] subscribePageToWebhook for page ${pageId} failed ${response.status}:`, errBody);
      return { success: false, error: errBody };
    }

    const data = (await response.json()) as { success?: boolean };
    console.log(`[Meta] Subscribed page ${pageId} to webhook fields: ${fields}`);
    return { success: data.success ?? true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Meta] subscribePageToWebhook error for page ${pageId}:`, errMsg);
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
