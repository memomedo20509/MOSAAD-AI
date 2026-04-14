import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/models/auth";

const ROLES = ["super_admin", "admin", "sales_manager", "team_leader", "sales_agent", "company_owner", "sales_admin"] as const;

function UserForm({ onSave, onCancel, isPending }: {
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ username: "", password: "", email: "", firstName: "", lastName: "", role: "sales_agent", isActive: true });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>First Name</Label>
          <Input data-testid="input-first-name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input data-testid="input-last-name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Username *</Label>
        <Input data-testid="input-username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
      </div>
      <div>
        <Label>Password *</Label>
        <Input data-testid="input-password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
      </div>
      <div>
        <Label>Email</Label>
        <Input data-testid="input-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div>
        <Label>Role</Label>
        <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
          <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-is-active" />
        <Label>Active</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.username || !form.password || isPending} data-testid="button-save-user">
          {isPending ? "Creating..." : "Create User"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
      toast({ title: "User created" });
    },
    onError: () => toast({ title: "Failed to create user", variant: "destructive" }),
  });

  return (
    <div className="space-y-6" data-testid="page-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage team members and their access</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No users yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-3 px-4 font-medium">Name</th>
                    <th className="text-start py-3 px-4 font-medium">Username</th>
                    <th className="text-start py-3 px-4 font-medium">Email</th>
                    <th className="text-start py-3 px-4 font-medium">Role</th>
                    <th className="text-start py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50" data-testid={`row-user-${user.id}`}>
                      <td className="py-3 px-4 font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.username}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email ?? "—"}</td>
                      <td className="py-3 px-4"><Badge variant="secondary">{user.role ?? "—"}</Badge></td>
                      <td className="py-3 px-4">
                        <Badge className={user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <UserForm onSave={data => createMutation.mutate(data)} onCancel={() => setDialogOpen(false)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
