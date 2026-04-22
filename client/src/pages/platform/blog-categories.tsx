import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Plus, Edit, Trash2, ArrowRight } from "lucide-react";
import type { ArticleCategory } from "@shared/schema";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/--+/g, "-")
    .trim();
}

type FormState = { name: string; nameEn: string; slug: string; description: string };

export default function BlogCategoriesPage() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ArticleCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", nameEn: "", slug: "", description: "" });

  const { data: categories = [], isLoading } = useQuery<ArticleCategory[]>({
    queryKey: ["/api/platform/blog/categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) => apiRequest("POST", "/api/platform/blog/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/blog/categories"] });
      toast({ title: t.blogCatCreated });
      setOpen(false);
      resetForm();
    },
    onError: () => toast({ title: t.errorGeneric, description: t.blogCatCreateFail, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) => apiRequest("PATCH", `/api/platform/blog/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/blog/categories"] });
      toast({ title: t.blogCatUpdated });
      setOpen(false);
      resetForm();
    },
    onError: () => toast({ title: t.errorGeneric, description: t.blogCatUpdateFail, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/platform/blog/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/blog/categories"] });
      toast({ title: t.blogCatDeleted });
      setDeleteId(null);
    },
  });

  function resetForm() {
    setForm({ name: "", nameEn: "", slug: "", description: "" });
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(cat: ArticleCategory) {
    setEditing(cat);
    setForm({ name: cat.name, nameEn: cat.nameEn ?? "", slug: cat.slug, description: cat.description ?? "" });
    setOpen(true);
  }

  function handleSubmit() {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/platform/blog"><ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t.blogCatTitle}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t.blogCatDesc}</p>
          </div>
        </div>
        <Button onClick={openCreate} data-testid="button-create-category">
          <Plus className="h-4 w-4 me-2" />
          {t.blogCatNewBtn}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t.blogCatEmpty}</p>
              <Button className="mt-4" onClick={openCreate}>{t.blogCatAddFirst}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} data-testid={`card-category-${cat.id}`} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div>
                    <p className="font-medium" data-testid={`text-category-name-${cat.id}`}>{cat.name}</p>
                    {cat.nameEn && <p className="text-sm text-muted-foreground">{cat.nameEn}</p>}
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{cat.slug}</p>
                    {cat.description && <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(cat.id)} data-testid={`button-delete-category-${cat.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={o => { if (!o) { setOpen(false); resetForm(); } else setOpen(true); }}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editing ? t.blogCatEditTitle : t.blogCatNewTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t.blogCatNameArLabel}</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                data-testid="input-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-name-en">{t.blogCatNameEnLabel}</Label>
              <Input id="cat-name-en" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} data-testid="input-category-name-en" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">{t.blogCatSlugLabel}</Label>
              <Input id="cat-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} dir="ltr" data-testid="input-category-slug" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">{t.blogCatDescLabel}</Label>
              <Textarea id="cat-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} data-testid="input-category-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>{t.blogCatCancel}</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name || !form.slug} data-testid="button-save-category">
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t.blogCatSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.blogCatDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.blogCatDeleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.blogCatDeleteCancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t.blogCatDeleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
