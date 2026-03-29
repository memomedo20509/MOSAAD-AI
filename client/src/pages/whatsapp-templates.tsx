import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Info,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WhatsappTemplate } from "@shared/schema";

export default function WhatsAppTemplatesPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formBody, setFormBody] = useState("");

  const { data: templates, isLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: ["/api/whatsapp/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; body: string }) => {
      const res = await apiRequest("POST", "/api/whatsapp/templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      setShowDialog(false);
      toast({ title: "تم إنشاء القالب بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في إنشاء القالب", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; body: string } }) => {
      const res = await apiRequest("PATCH", `/api/whatsapp/templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      setShowDialog(false);
      toast({ title: "تم تحديث القالب بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث القالب", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/whatsapp/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      toast({ title: "تم حذف القالب بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حذف القالب", variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingTemplate(null);
    setFormName("");
    setFormBody("");
    setShowDialog(true);
  }

  function openEdit(template: WhatsappTemplate) {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormBody(template.body);
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!formName.trim() || !formBody.trim()) return;
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: { name: formName, body: formBody } });
    } else {
      createMutation.mutate({ name: formName, body: formBody });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back-templates">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-templates-title">
            قوالب رسائل واتساب
          </h1>
          <p className="text-muted-foreground">إدارة القوالب الجاهزة لإرسالها للليدز</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          قالب جديد
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
            <p>
              يمكنك استخدام متغيرات ديناميكية في نص القالب:{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{client_name}}"}</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{project_name}}"}</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{phone}}"}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.isActive && (
                      <Badge variant="secondary" className="text-xs">نشط</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(template.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border rounded-md p-3 bg-muted/30">
                  {template.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">لا يوجد قوالب بعد</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
              أنشئ أول قالب رسالة لتسريع المتابعة مع الليدز
            </p>
            <Button className="mt-4" onClick={openCreate} data-testid="button-create-first-template">
              <Plus className="h-4 w-4 mr-2" />
              إنشاء قالب
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "تعديل القالب" : "قالب جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم القالب</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: رسالة التعريف الأولى"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label>نص الرسالة</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder={`أهلاً {{client_name}}، أنا من HomeAdvisor CRM...`}
                rows={6}
                data-testid="textarea-template-body"
              />
              <p className="text-xs text-muted-foreground">
                متغيرات متاحة:{" "}
                <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{project_name}}"}</code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formName.trim() || !formBody.trim() || isPending}
              data-testid="button-save-template"
            >
              {isPending ? "جاري الحفظ..." : editingTemplate ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
