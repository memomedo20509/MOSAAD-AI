import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

type SseEventType =
  | "new_whatsapp_message"
  | "new_lead"
  | "lead_updated"
  | "new_notification"
  | "ping";

interface SseEvent {
  type: SseEventType;
  payload?: Record<string, unknown>;
}

const INVALIDATION_MAP: Record<SseEventType, string[]> = {
  new_whatsapp_message: [
    "/api/whatsapp/conversations",
    "/api/whatsapp/unread-count",
    "/api/notifications",
  ],
  new_lead: [
    "/api/leads",
    "/api/my-day",
    "/api/whatsapp/conversations",
    "/api/whatsapp/unread-count",
    "/api/notifications",
    "/api/dashboard",
  ],
  lead_updated: [
    "/api/leads",
    "/api/my-day",
    "/api/dashboard",
  ],
  new_notification: [
    "/api/notifications",
  ],
  ping: [],
};

export function useRealtime() {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;
      const es = new EventSource("/api/events/stream", { withCredentials: true });
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const event: SseEvent = JSON.parse(e.data);
          const keys = INVALIDATION_MAP[event.type] ?? [];
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
          if (event.type === "new_whatsapp_message" && event.payload?.leadId) {
            queryClient.invalidateQueries({
              queryKey: ["/api/whatsapp/conversation", event.payload.leadId],
            });
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (active) {
          reconnectTimer.current = setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, []);
}
