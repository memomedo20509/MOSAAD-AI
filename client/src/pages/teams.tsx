import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import type { Team, User } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function TeamsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("POST", "/api/teams", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: t.teamCreatedSuccess });
      setIsAddOpen(false);
    },
    onError: () => {
      toast({ title: t.teamCreatedError, variant: "destructive" });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      return apiRequest("PATCH", `/api/teams/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: t.teamUpdatedSuccess });
      setEditingTeam(null);
    },
    onError: () => {
      toast({ title: t.teamUpdatedError, variant: "destructive" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: t.teamDeletedSuccess });
    },
    onError: () => {
      toast({ title: t.teamDeletedError, variant: "destructive" });
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTeamMutation.mutate({ name: formData.get("name") as string });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeam) return;
    const formData = new FormData(e.currentTarget);
    updateTeamMutation.mutate({
      id: editingTeam.id,
      data: { name: formData.get("name") as string },
    });
  };

  const getTeamMembers = (teamId: string) => {
    return users.filter((user) => user.teamId === teamId);
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.teamsTitle}</h1>
          <p className="text-muted-foreground">{t.teamsSubtitle}</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-team">
              <Plus className="h-4 w-4 mr-2" />
              {t.addTeam}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.addTeam}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.teamName}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t.teamName}
                  required
                  data-testid="input-team-name"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-save-team">
                {t.create}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => {
          const members = getTeamMembers(team.id);
          return (
            <Card key={team.id} data-testid={`card-team-${team.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {team.name}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Dialog open={editingTeam?.id === team.id} onOpenChange={(open) => {
                    if (!open) setEditingTeam(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingTeam(team)}
                        data-testid={`button-edit-team-${team.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.editTeam}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editName">{t.teamName}</Label>
                          <Input
                            id="editName"
                            name="name"
                            defaultValue={team.name}
                            required
                            data-testid="input-edit-team-name"
                          />
                        </div>
                        <Button type="submit" className="w-full" data-testid="button-update-team">
                          {t.update}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(t.deleteTeamConfirm)) {
                        deleteTeamMutation.mutate(team.id);
                      }
                    }}
                    data-testid={`button-delete-team-${team.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-3">
                  {members.length} {t.members}
                </div>
                {members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {members.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 text-sm bg-muted px-2 py-1 rounded"
                      >
                        {member.profileImageUrl ? (
                          <img
                            src={member.profileImageUrl}
                            alt={member.firstName || ""}
                            className="h-5 w-5 rounded-full"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                            {member.firstName?.[0] || "?"}
                          </div>
                        )}
                        <span>{member.firstName}</span>
                      </div>
                    ))}
                    {members.length > 5 && (
                      <div className="text-sm text-muted-foreground px-2 py-1">
                        +{members.length - 5} more
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.noTeamsYet}</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {teams.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {t.noTeamsFound}
          </div>
        )}
      </div>
    </div>
  );
}
