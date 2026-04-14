import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "lost"] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  qualified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function LeadForm({ initial, onSave, onCancel, isPending }: {
  initial?: Partial<Lead>;
  onSave: (data: Partial<Lead>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    interest: initial?.interest ?? "",
    sourceChannel: initial?.sourceChannel ?? "",
    status: initial?.status ?? "new",
    notes: initial?.notes ?? "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input data-testid="input-lead-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contact name" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input data-testid="input-lead-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input data-testid="input-lead-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Interest</Label>
          <Input data-testid="input-lead-interest" value={form.interest} onChange={e => setForm(f => ({ ...f, interest: e.target.value }))} placeholder="What are they interested in?" />
        </div>
        <div>
          <Label>Source Channel</Label>
          <Input data-testid="input-lead-channel" value={form.sourceChannel} onChange={e => setForm(f => ({ ...f, sourceChannel: e.target.value }))} placeholder="e.g. website, whatsapp" />
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger data-testid="select-lead-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea data-testid="input-lead-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={3} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isPending} data-testid="button-save-lead">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setDialogOpen(false);
      toast({ title: "Lead created" });
    },
    onError: () => toast({ title: "Failed to create lead", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => apiRequest("PATCH", `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setEditLead(null);
      toast({ title: "Lead updated" });
    },
    onError: () => toast({ title: "Failed to update lead", variant: "destructive" }),
  });

  return (
    <div className="space-y-6" data-testid="page-leads">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Contacts captured by your chatbot</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-lead">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No leads yet</p>
              <p className="text-sm text-muted-foreground">Leads captured by your chatbot will appear here</p>
            </div>
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
                    <th className="text-start py-3 px-4 font-medium">Phone</th>
                    <th className="text-start py-3 px-4 font-medium">Interest</th>
                    <th className="text-start py-3 px-4 font-medium">Channel</th>
                    <th className="text-start py-3 px-4 font-medium">Status</th>
                    <th className="text-start py-3 px-4 font-medium">Created</th>
                    <th className="text-end py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/50" data-testid={`row-lead-${lead.id}`}>
                      <td className="py-3 px-4 font-medium">{lead.name ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{lead.phone ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{lead.interest ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{lead.sourceChannel ?? "—"}</td>
                      <td className="py-3 px-4">
                        <Badge className={STATUS_COLORS[lead.status] ?? ""}>{lead.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <Button size="icon" variant="ghost" onClick={() => setEditLead(lead)} data-testid={`button-edit-lead-${lead.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
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
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <LeadForm onSave={data => createMutation.mutate(data)} onCancel={() => setDialogOpen(false)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLead} onOpenChange={open => !open && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && <LeadForm initial={editLead} onSave={data => updateMutation.mutate({ id: editLead.id, data })} onCancel={() => setEditLead(null)} isPending={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
