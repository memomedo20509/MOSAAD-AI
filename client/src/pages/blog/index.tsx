import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { Article, ArticleCategory } from "@shared/schema";

function ArticleCard({ article, category }: { article: Article & { category: ArticleCategory | null }; category?: ArticleCategory | null }) {
  const cat = article.category ?? category;
  return (
    <Link href={`/blog/${article.slug}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-article-${article.id}`}>
        {article.featuredImage && (
          <div className="overflow-hidden rounded-t-lg">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            {cat && <Badge variant="secondary" className="text-xs">{cat.name}</Badge>}
            {article.readingTimeMinutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.readingTimeMinutes} دقيقة
              </span>
            )}
          </div>
          <h2 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors mb-2" data-testid={`text-article-title-${article.id}`}>
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-2">{article.excerpt}</p>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            {article.publishedAt && new Date(article.publishedAt).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BlogIndexPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (categorySlug) params.set("category", categorySlug);
  params.set("page", String(page));
  params.set("limit", "10");

  const { data, isLoading } = useQuery<{ articles: (Article & { category: ArticleCategory | null })[]; total: number }>({
    queryKey: ["/api/blog/articles", search, categorySlug, page],
    queryFn: () => fetch(`/api/blog/articles?${params}`).then(r => r.json()),
  });

  const { data: categories = [] } = useQuery<ArticleCategory[]>({
    queryKey: ["/api/blog/categories"],
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-10 text-center">
          <h1 className="text-4xl font-bold mb-3">المدونة</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            أحدث المقالات حول الشات بوت وإدارة العملاء والرسائل الآلية
          </p>
          <div className="flex gap-2 mt-6 max-w-md mx-auto">
            <Input
              placeholder="ابحث في المقالات..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="flex-1"
              data-testid="input-blog-search"
            />
            <Button onClick={handleSearch} data-testid="button-blog-search">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={categorySlug === "" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCategorySlug(""); setPage(1); }}
              data-testid="button-filter-all"
            >
              الكل
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={categorySlug === cat.slug ? "default" : "outline"}
                size="sm"
                onClick={() => { setCategorySlug(cat.slug); setPage(1); }}
                data-testid={`button-filter-${cat.slug}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 rounded-t-lg" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">لا توجد مقالات</p>
            {search && <Button variant="link" onClick={() => { setSearch(""); setSearchInput(""); }}>مسح البحث</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-blog-prev">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-blog-next">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
