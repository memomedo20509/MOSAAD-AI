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

export default function TeamsPage() {
  const { toast } = useToast();
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
      toast({ title: "Team created successfully" });
      setIsAddOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create team", variant: "destructive" });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      return apiRequest("PATCH", `/api/teams/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team updated successfully" });
      setEditingTeam(null);
    },
    onError: () => {
      toast({ title: "Failed to update team", variant: "destructive" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
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
        <div className="animate-pulse text-muted-foreground">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Team Management</h1>
          <p className="text-muted-foreground">Organize your sales teams</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-team">
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter team name"
                  required
                  data-testid="input-team-name"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-save-team">
                Create Team
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
                        <DialogTitle>Edit Team</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editName">Team Name</Label>
                          <Input
                            id="editName"
                            name="name"
                            defaultValue={team.name}
                            required
                            data-testid="input-edit-team-name"
                          />
                        </div>
                        <Button type="submit" className="w-full" data-testid="button-update-team">
                          Update Team
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this team?")) {
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
                  {members.length} member{members.length !== 1 ? "s" : ""}
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
                  <p className="text-sm text-muted-foreground">No members yet</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {teams.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No teams created yet. Click "Add Team" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
