import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit, UserCheck, UserX, Search } from "lucide-react";
import type { User, Team } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function UsersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    super_admin: t.superAdmin,
    admin: t.admin,
    sales_manager: t.salesManager,
    sales_agent: t.salesAgent,
  };

  const ROLE_COLORS: Record<string, string> = {
    super_admin: "bg-red-500/10 text-red-600",
    admin: "bg-purple-500/10 text-purple-600",
    sales_manager: "bg-blue-500/10 text-blue-600",
    sales_agent: "bg-green-500/10 text-green-600",
  };

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t.userUpdatedSuccess });
      setIsDialogOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: t.userUpdatedError, variant: "destructive" });
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        role: formData.get("role") as string,
        teamId: formData.get("teamId") as string || null,
        isActive: formData.get("isActive") === "true",
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.usersTitle}</h1>
          <p className="text-muted-foreground">{t.usersSubtitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.users} ({filteredUsers.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.searchUsers}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rtl:pl-3 rtl:pr-9"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-4"
                data-testid={`row-user-${user.id}`}
              >
                <div className="flex items-center gap-4">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.firstName || "User"}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className={ROLE_COLORS[user.role || "sales_agent"]}>
                    {ROLE_LABELS[user.role || "sales_agent"]}
                  </Badge>
                  {user.isActive ? (
                    <Badge variant="outline" className="text-green-600">
                      <UserCheck className="h-3 w-3 mr-1" /> {t.active}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600">
                      <UserX className="h-3 w-3 mr-1" /> {t.inactive}
                    </Badge>
                  )}

                  <Dialog open={isDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingUser(user);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.editUser}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>{t.email}</Label>
                          <Input value={user.email || ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.role}</Label>
                          <Select name="role" defaultValue={user.role || "sales_agent"}>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">{t.superAdmin}</SelectItem>
                              <SelectItem value="admin">{t.admin}</SelectItem>
                              <SelectItem value="sales_manager">{t.salesManager}</SelectItem>
                              <SelectItem value="sales_agent">{t.salesAgent}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t.team}</Label>
                          <Select name="teamId" defaultValue={user.teamId || ""}>
                            <SelectTrigger data-testid="select-team">
                              <SelectValue placeholder={t.selectTeam} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">{t.noTeam}</SelectItem>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t.status}</Label>
                          <Select name="isActive" defaultValue={user.isActive ? "true" : "false"}>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">{t.active}</SelectItem>
                              <SelectItem value="false">{t.inactive}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full" data-testid="button-save-user">
                          {t.save}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                {t.noUsersFound}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
