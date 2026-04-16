import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Clock, Calendar, Share2, Copy, MessageCircle, Twitter, Facebook, Linkedin, CheckCheck } from "lucide-react";
import type { Article, ArticleCategory } from "@shared/schema";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(html: string): TocItem[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");
  const toc: TocItem[] = [];
  let counter = 0;
  headings.forEach(el => {
    const id = `heading-${counter++}`;
    el.id = id;
    toc.push({ id, text: el.textContent ?? "", level: parseInt(el.tagName[1]) });
  });
  return toc;
}

function injectHeadingIds(html: string): string {
  let counter = 0;
  return html.replace(/<h([23])[^>]*>/gi, (_, level) => `<h${level} id="heading-${counter++}">`);
}

function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Share2 className="h-4 w-4" />
        شارك:
      </span>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, "_blank")}
        data-testid="button-share-whatsapp"
      >
        <MessageCircle className="h-4 w-4 text-green-500" />
        واتساب
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, "_blank")}
        data-testid="button-share-twitter"
      >
        <Twitter className="h-4 w-4 text-sky-500" />
        X
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")}
        data-testid="button-share-facebook"
      >
        <Facebook className="h-4 w-4 text-blue-600" />
        فيسبوك
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank")}
        data-testid="button-share-linkedin"
      >
        <Linkedin className="h-4 w-4 text-blue-700" />
        لينكدإن
      </Button>
      <Button variant="outline" size="sm" className="gap-1" onClick={copyLink} data-testid="button-share-copy">
        {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        {copied ? "تم النسخ" : "نسخ الرابط"}
      </Button>
    </div>
  );
}

function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="sticky top-6">
      <CardContent className="pt-4 pb-4">
        <p className="font-semibold mb-3 text-sm">محتويات المقال</p>
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.id} className={item.level === 3 ? "mr-4" : ""}>
              <a
                href={`#${item.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={e => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const { data, isLoading, isError } = useQuery<{ article: Article & { category?: ArticleCategory }; related: Article[] }>({
    queryKey: ["/api/blog/articles", slug],
    queryFn: () => fetch(`/api/blog/articles/${slug}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
  });

  const article = data?.article;
  const related = data?.related ?? [];

  const processedBody = article?.body ? injectHeadingIds(article.body) : "";
  const toc = article?.body ? extractToc(article.body) : [];
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (article) {
      document.title = article.metaTitle || article.title;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute("content", article.metaDescription ?? article.excerpt ?? "");
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">المقال غير موجود</p>
          <Button asChild variant="link">
            <Link href="/blog">العودة للمدونة</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {article.metaDescription && (
        <meta name="description" content={article.metaDescription} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.metaDescription ?? article.excerpt ?? "",
            image: article.ogImage ?? article.featuredImage ?? undefined,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            author: { "@type": "Person", name: article.authorName ?? "SalesBot AI" },
          }),
        }}
      />

      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/blog">
              <ArrowRight className="h-4 w-4 ml-2" />
              المدونة
            </Link>
          </Button>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {article.category && (
              <Badge variant="secondary">{(article.category as ArticleCategory).name}</Badge>
            )}
            {article.tags?.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight" data-testid="text-article-title">{article.title}</h1>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
            {article.authorName && <span>{article.authorName}</span>}
            {article.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(article.publishedAt).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            {article.readingTimeMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.readingTimeMinutes} دقيقة للقراءة
              </span>
            )}
          </div>
        </div>
      </header>

      {article.featuredImage && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full max-h-96 object-cover rounded-xl"
          />
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <article className="lg:col-span-3">
            {article.excerpt && (
              <p className="text-lg text-muted-foreground mb-6 border-r-4 border-primary pr-4 italic">{article.excerpt}</p>
            )}
            <div
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: processedBody }}
              data-testid="article-content"
            />
            <Separator className="my-8" />
            <ShareButtons title={article.title} url={currentUrl} />
          </article>

          <aside className="space-y-6">
            <TableOfContents items={toc} />
          </aside>
        </div>
      </main>

      {related.length > 0 && (
        <section className="border-t bg-muted/30 py-10" dir="rtl">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-xl font-bold mb-6">مقالات ذات صلة</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map(rel => (
                <Link key={rel.id} href={`/blog/${rel.slug}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-related-${rel.id}`}>
                    {rel.featuredImage && (
                      <img src={rel.featuredImage} alt={rel.title} className="w-full h-36 object-cover rounded-t-lg" />
                    )}
                    <CardContent className="p-4">
                      <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{rel.title}</p>
                      {rel.readingTimeMinutes && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rel.readingTimeMinutes} دقيقة
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
