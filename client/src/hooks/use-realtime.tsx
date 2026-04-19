import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

export function useRealtime() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const es = new EventSource("/api/sse");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_lead") {
          queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } else if (data.type === "new_whatsapp_message") {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
        } else if (data.type === "new_social_message") {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/social-inbox"] });
        } else if (data.type === "new_notification") {
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  }, [user]);
}
