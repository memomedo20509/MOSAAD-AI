const WA_CLOUD_BASE = "https://graph.facebook.com/v19.0";

export interface WhatsAppCloudMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  profile?: { name: string };
}

export interface WhatsAppCloudWebhookEntry {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: WhatsAppCloudMessage[];
      statuses?: unknown[];
    };
    field: string;
  }[];
}

export interface ParsedWhatsAppCloudMessage {
  phone: string;
  messageText: string;
  messageId: string;
  timestamp: Date;
  senderName?: string;
  phoneNumberId: string;
}

export function parseWhatsAppCloudPayload(
  body: Record<string, unknown>
): ParsedWhatsAppCloudMessage[] {
  const results: ParsedWhatsAppCloudMessage[] = [];
  try {
    const entries = body.entry as WhatsAppCloudWebhookEntry[] | undefined;
    if (!Array.isArray(entries)) return results;

    for (const entry of entries) {
      if (!Array.isArray(entry.changes)) continue;
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        if (!value || !Array.isArray(value.messages)) continue;

        const phoneNumberId = value.metadata?.phone_number_id ?? "";
        const contacts = value.contacts ?? [];

        for (const msg of value.messages) {
          if (msg.type !== "text" || !msg.text?.body) continue;
          const phone = msg.from;
          const contact = contacts.find((c) => c.wa_id === phone);
          const senderName = contact?.profile?.name;
          const tsMs = parseInt(msg.timestamp) * 1000;
          results.push({
            phone,
            messageText: msg.text.body,
            messageId: msg.id,
            timestamp: new Date(tsMs),
            senderName,
            phoneNumberId,
          });
        }
      }
    }
  } catch (err) {
    console.error("[WhatsAppCloud] parsePayload error:", err);
  }
  return results;
}

export async function sendWhatsAppCloudMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = `${WA_CLOUD_BASE}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: { preview_url: false, body: messageText },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WhatsAppCloud] Send error ${response.status}: ${errText}`);
      return { success: false, error: `${response.status}: ${errText}` };
    }

    const data = (await response.json()) as { messages?: { id: string }[] };
    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsAppCloud] sendMessage exception:", msg);
    return { success: false, error: msg };
  }
}

export async function markWhatsAppCloudMessageRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  try {
    const url = `${WA_CLOUD_BASE}/${phoneNumberId}/messages`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch {
  }
}
