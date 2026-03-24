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
import { Users, Edit, UserCheck, UserX, Search, Plus } from "lucide-react";
import type { User, Team } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_ARABIC_NAMES, ROLE_COLORS } from "@shared/models/auth";

function getRoleName(role: string | null | undefined): string {
  return ROLE_ARABIC_NAMES[(role ?? "sales_agent") as keyof typeof ROLE_ARABIC_NAMES] || role || "سيلز";
}

function getRoleColor(role: string | null | undefined): string {
  return ROLE_COLORS[(role ?? "sales_agent") as keyof typeof ROLE_COLORS] || "bg-gray-500/10 text-gray-600";
}

export default function UsersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "sales_admin";

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t.userUpdatedSuccess });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: t.userUpdatedError, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t.userCreatedSuccess });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: t.userCreatedError, variant: "destructive" });
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const updateData: Record<string, unknown> = {
      role: formData.get("role") as string,
      teamId: (formData.get("teamId") as string) || null,
      isActive: formData.get("isActive") === "true",
      firstName: formData.get("firstName") as string || null,
      lastName: formData.get("lastName") as string || null,
      phone: formData.get("phone") as string || null,
    };
    if (password) {
      updateData.password = password;
    }
    updateUserMutation.mutate({
      id: editingUser.id,
      data: updateData,
    });
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUserMutation.mutate({
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      email: formData.get("email") as string || null,
      firstName: formData.get("firstName") as string || null,
      lastName: formData.get("lastName") as string || null,
      phone: formData.get("phone") as string || null,
      role: formData.get("role") as string || "sales_agent",
      teamId: (formData.get("teamId") as string) || null,
      isActive: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  const ROLE_OPTIONS = [
    { value: "super_admin", label: "مدير النظام" },
    { value: "company_owner", label: "صاحب الشركة" },
    { value: "sales_admin", label: "سيلز ادمن" },
    { value: "team_leader", label: "تيم ليدر" },
    { value: "sales_agent", label: "سيلز" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.usersTitle}</h1>
          <p className="text-muted-foreground">{t.usersSubtitle}</p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {t.addUser}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t.addUser}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.firstName}</Label>
                    <Input name="firstName" placeholder={t.firstName} data-testid="input-first-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.lastName}</Label>
                    <Input name="lastName" placeholder={t.lastName} data-testid="input-last-name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.username} *</Label>
                  <Input name="username" required placeholder={t.username} data-testid="input-username" />
                </div>
                <div className="space-y-2">
                  <Label>{t.email}</Label>
                  <Input name="email" type="email" placeholder={t.email} data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label>رقم التليفون</Label>
                  <Input name="phone" placeholder="01xxxxxxxxx" data-testid="input-phone" />
                </div>
                <div className="space-y-2">
                  <Label>{t.password} *</Label>
                  <Input name="password" type="password" required placeholder={t.password} data-testid="input-password" />
                </div>
                <div className="space-y-2">
                  <Label>{t.role}</Label>
                  <Select name="role" defaultValue="sales_agent">
                    <SelectTrigger data-testid="select-role-add">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.team}</Label>
                  <Select name="teamId" defaultValue="">
                    <SelectTrigger data-testid="select-team-add">
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
                <Button type="submit" className="w-full" disabled={createUserMutation.isPending} data-testid="button-save-new-user">
                  {createUserMutation.isPending ? t.saving : t.create}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
                      {!user.firstName && !user.lastName && <span className="text-muted-foreground">{user.username}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email || user.username}</div>
                    {user.phone && <div className="text-xs text-muted-foreground">{user.phone}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={getRoleColor(user.role)} data-testid={`badge-role-${user.id}`}>
                    {getRoleName(user.role)}
                  </Badge>
                  {user.isActive ? (
                    <Badge variant="outline" className="text-green-600" data-testid={`badge-status-${user.id}`}>
                      <UserCheck className="h-3 w-3 mr-1" /> {t.active}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600" data-testid={`badge-status-${user.id}`}>
                      <UserX className="h-3 w-3 mr-1" /> {t.inactive}
                    </Badge>
                  )}

                  {isAdmin && (
                    <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                      setIsEditDialogOpen(open);
                      if (!open) setEditingUser(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditDialogOpen(true);
                          }}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t.editUser}: {user.username}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>{t.firstName}</Label>
                              <Input name="firstName" defaultValue={user.firstName || ""} data-testid="input-edit-first-name" />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.lastName}</Label>
                              <Input name="lastName" defaultValue={user.lastName || ""} data-testid="input-edit-last-name" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>رقم التليفون</Label>
                            <Input name="phone" defaultValue={user.phone || ""} data-testid="input-edit-phone" />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.password} (اتركه فارغاً للإبقاء على القديم)</Label>
                            <Input name="password" type="password" placeholder="كلمة سر جديدة" data-testid="input-edit-password" />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.role}</Label>
                            <Select name="role" defaultValue={user.role || "sales_agent"}>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
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
                          <Button type="submit" className="w-full" disabled={updateUserMutation.isPending} data-testid="button-save-user">
                            {updateUserMutation.isPending ? t.saving : t.save}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
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
