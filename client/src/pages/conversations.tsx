import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import type { Conversation } from "@shared/schema";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function ConversationsPage() {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({ queryKey: ["/api/conversations"] });

  return (
    <div className="space-y-6" data-testid="page-conversations">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conversations Inbox</h1>
        <p className="text-muted-foreground">All chatbot conversations across channels</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm text-muted-foreground">Conversations will appear here when your chatbot starts receiving messages</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <Card key={conv.id} className="hover:bg-muted/50 cursor-pointer transition-colors" data-testid={`card-conversation-${conv.id}`}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{conv.contactName ?? "Anonymous"}</p>
                    <Badge className={STATUS_COLORS[conv.status] ?? ""}>{conv.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{conv.platform} {conv.contactPhone ? `· ${conv.contactPhone}` : ""}</p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {conv.updatedAt ? format(new Date(conv.updatedAt), "MMM d, HH:mm") : ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
