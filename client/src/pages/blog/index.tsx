import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, ChevronLeft, ChevronRight, Calendar, BookOpen } from "lucide-react";
import type { Article, ArticleCategory } from "@shared/schema";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ArticleCard({ article }: { article: Article & { category: ArticleCategory | null } }) {
  const cat = article.category;
  const authorInitials = article.authorName ? getInitials(article.authorName) : "S";

  return (
    <Link href={`/blog/${article.slug}`}>
      <div
        className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
        data-testid={`card-article-${article.id}`}
      >
        {article.featuredImage ? (
          <div className="overflow-hidden h-48 shrink-0">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-48 shrink-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-indigo-300" />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {cat && (
              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs px-2.5 py-0.5">
                {cat.name}
              </Badge>
            )}
            {article.readingTimeMinutes && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.readingTimeMinutes} دقيقة
              </span>
            )}
          </div>

          <h2
            className="font-bold text-lg leading-tight text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 flex-1"
            data-testid={`text-article-title-${article.id}`}
          >
            {article.title}
          </h2>

          {article.excerpt && (
            <p className="text-gray-500 text-sm line-clamp-2 mb-4">{article.excerpt}</p>
          )}

          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{authorInitials}</span>
            </div>
            <div className="min-w-0">
              {article.authorName && (
                <p className="text-sm font-medium text-gray-700 truncate">{article.authorName}</p>
              )}
              {article.publishedAt && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(article.publishedAt).toLocaleDateString("ar", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
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
  params.set("limit", "9");

  const { data, isLoading } = useQuery<{
    articles: (Article & { category: ArticleCategory | null })[];
    total: number;
  }>({
    queryKey: ["/api/blog/articles", search, categorySlug, page],
    queryFn: () => fetch(`/api/blog/articles?${params}`).then((r) => r.json()),
  });

  const { data: categories = [] } = useQuery<ArticleCategory[]>({
    queryKey: ["/api/blog/categories"],
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 9);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 py-24">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 h-64 w-64 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/10 text-white border-white/20 mb-6 px-4 py-1.5">
            المدوّنة
          </Badge>
          <h1 className="text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-tight">
            أفكار وتجارب{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              لنمو مبيعاتك
            </span>
          </h1>
          <p className="text-xl text-indigo-200 leading-relaxed max-w-2xl mx-auto mb-8">
            أحدث المقالات حول الشات بوت وإدارة العملاء والرسائل الآلية
          </p>

          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              placeholder="ابحث في المقالات..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-indigo-300 focus-visible:ring-white/30"
              data-testid="input-blog-search"
            />
            <Button
              onClick={handleSearch}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shrink-0"
              data-testid="button-blog-search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => { setCategorySlug(""); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                categorySlug === ""
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}
              data-testid="button-filter-all"
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setCategorySlug(cat.slug); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  categorySlug === cat.slug
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
                data-testid={`button-filter-${cat.slug}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Results info */}
        {!isLoading && search && (
          <p className="text-sm text-gray-500 mb-5">
            نتائج البحث عن "{search}": {total} مقال
          </p>
        )}

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-10 w-10 text-indigo-300" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-1">لا توجد مقالات</p>
            <p className="text-gray-400 text-sm mb-4">لم نجد أي مقالات تطابق بحثك</p>
            {search && (
              <Button
                variant="outline"
                onClick={() => { setSearch(""); setSearchInput(""); }}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                مسح البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              data-testid="button-blog-prev"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500 px-2">
              {page} من {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              data-testid="button-blog-next"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
