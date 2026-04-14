import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  return (
    <Button variant="ghost" size="icon" data-testid="button-notifications" className="relative">
      <Bell className="h-5 w-5" />
    </Button>
  );
}
