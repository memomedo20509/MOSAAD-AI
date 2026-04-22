import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Loader2, Plus, Search, MoreVertical, Edit, Trash2, Eye, Archive, CheckCircle, Tag } from "lucide-react";
import type { Article, ArticleCategory } from "@shared/schema";

export default function PlatformBlogPage() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const statusBadge = (status: string) => {
    if (status === "published") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t.blogStatusPublished}</Badge>;
    if (status === "archived") return <Badge variant="secondary">{t.blogStatusArchived}</Badge>;
    return <Badge variant="outline">{t.blogStatusDraft}</Badge>;
  };

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading } = useQuery<{ articles: Article[]; total: number }>({
    queryKey: ["/api/platform/blog/articles", statusFilter, search, page],
    queryFn: () => fetch(`/api/platform/blog/articles?${params}`).then(r => r.json()),
  });

  const { data: categories } = useQuery<ArticleCategory[]>({
    queryKey: ["/api/platform/blog/categories"],
  });

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]));

  const updateStatus = useMutation({
    mutationFn: ({ id, status, publishedAt }: { id: string; status: string; publishedAt?: string | null }) =>
      apiRequest("PATCH", `/api/platform/blog/articles/${id}`, { status, publishedAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/blog/articles"] });
      toast({ title: t.blogStatusUpdated });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/platform/blog/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/blog/articles"] });
      toast({ title: t.blogDeleted });
      setDeleteId(null);
    },
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.blogTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.blogDesc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/platform/blog/categories">
              <Tag className="h-4 w-4 me-2" />
              {t.blogCategoriesBtn}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/platform/blog/editor">
              <Plus className="h-4 w-4 me-2" />
              {t.blogNewArticleBtn}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
              <Input
                placeholder={t.blogSearchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className={isRTL ? "pr-9" : "pl-9"}
                data-testid="input-search-articles"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder={t.blogStatusFilter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.blogStatusAll}</SelectItem>
                <SelectItem value="draft">{t.blogStatusDraft}</SelectItem>
                <SelectItem value="published">{t.blogStatusPublished}</SelectItem>
                <SelectItem value="archived">{t.blogStatusArchived}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t.blogEmpty}</p>
              <Button className="mt-4" asChild>
                <Link href="/platform/blog/editor">{t.blogCreateFirst}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <div key={article.id} data-testid={`card-article-${article.id}`} className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(article.status)}
                      {article.categoryId && catMap[article.categoryId] && (
                        <Badge variant="secondary" className="text-xs">{catMap[article.categoryId].name}</Badge>
                      )}
                    </div>
                    <p className="font-semibold mt-1 truncate" data-testid={`text-article-title-${article.id}`}>{article.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{article.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{article.readingTimeMinutes ? `${article.readingTimeMinutes} ${t.blogReadingTime}` : ""}</span>
                      <span>{article.publishedAt
                        ? `${t.blogPublished} ${new Date(article.publishedAt).toLocaleDateString(isRTL ? "ar" : "en-US")}`
                        : `${t.blogEdited} ${new Date(article.updatedAt!).toLocaleDateString(isRTL ? "ar" : "en-US")}`
                      }</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-article-actions-${article.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/platform/blog/editor/${article.id}`}>
                          <Edit className="h-4 w-4 me-2" />
                          {t.blogEditBtn}
                        </Link>
                      </DropdownMenuItem>
                      {article.status !== "published" && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: article.id, status: "published", publishedAt: new Date().toISOString() })}>
                          <CheckCircle className="h-4 w-4 me-2" />
                          {t.blogPublishBtn}
                        </DropdownMenuItem>
                      )}
                      {article.status === "published" && (
                        <DropdownMenuItem asChild>
                          <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 me-2" />
                            {t.blogPreviewBtn}
                          </a>
                        </DropdownMenuItem>
                      )}
                      {article.status !== "archived" && (
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: article.id, status: "archived" })}>
                          <Archive className="h-4 w-4 me-2" />
                          {t.blogArchiveBtn}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(article.id)}>
                        <Trash2 className="h-4 w-4 me-2" />
                        {t.blogDeleteBtn}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
                {t.blogPrev}
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
                {t.blogNext}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.blogDeleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.blogDeleteConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.blogDeleteCancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t.blogDeleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
