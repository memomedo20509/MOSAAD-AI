import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, ArrowLeft,
  Clock,
  Calendar,
  Share2,
  Copy,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  CheckCheck,
  BookOpen,
} from "lucide-react";
import type { Article, ArticleCategory } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function extractToc(html: string): TocItem[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");
  const toc: TocItem[] = [];
  let counter = 0;
  headings.forEach((el) => {
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
  const { t } = useLanguage();
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-500 flex items-center gap-1">
        <Share2 className="h-4 w-4" />
        {t.pub_shareLabel}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 border-gray-200 hover:border-green-300 hover:text-green-600"
        onClick={() =>
          window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, "_blank")
        }
        data-testid="button-share-whatsapp"
      >
        <MessageCircle className="h-4 w-4 text-green-500" />
        WhatsApp
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 border-gray-200 hover:border-sky-300 hover:text-sky-600"
        onClick={() =>
          window.open(
            `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
            "_blank"
          )
        }
        data-testid="button-share-twitter"
      >
        <Twitter className="h-4 w-4 text-sky-500" />X
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 border-gray-200 hover:border-blue-300 hover:text-blue-600"
        onClick={() =>
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")
        }
        data-testid="button-share-facebook"
      >
        <Facebook className="h-4 w-4 text-blue-600" />
        Facebook
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 border-gray-200 hover:border-blue-400 hover:text-blue-700"
        onClick={() =>
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            "_blank"
          )
        }
        data-testid="button-share-linkedin"
      >
        <Linkedin className="h-4 w-4 text-blue-700" />
        LinkedIn
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
        onClick={copyLink}
        data-testid="button-share-copy"
      >
        {copied ? (
          <CheckCheck className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? t.pub_copied : t.pub_copyLink}
      </Button>
    </div>
  );
}

function TableOfContents({ items }: { items: TocItem[] }) {
  const { t, isRTL } = useLanguage();
  if (items.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
      <p className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-indigo-500" />
        {t.pub_tableOfContents}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? (isRTL ? "mr-4" : "ml-4") : ""}>
            <a
              href={`#${item.id}`}
              className="text-sm text-gray-500 hover:text-indigo-600 transition-colors block py-0.5 leading-snug"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const { t, language, isRTL } = useLanguage();
  const locale = language === "ar" ? "ar" : "en";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const { data, isLoading, isError } = useQuery<{
    article: Article & { category?: ArticleCategory };
    related: Article[];
  }>({
    queryKey: ["/api/blog/articles", slug],
    queryFn: () =>
      fetch(`/api/blog/articles/${slug}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
  });

  const article = data?.article;
  const related = data?.related ?? [];

  const activeBody = article
    ? (language === "ar"
        ? (article.bodyAr ?? article.bodyEn ?? article.body ?? "")
        : (article.bodyEn ?? article.bodyAr ?? article.body ?? ""))
    : "";
  const processedBody = activeBody ? injectHeadingIds(activeBody) : "";
  const toc = activeBody ? extractToc(activeBody) : [];
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const authorInitials = article?.authorName ? getInitials(article.authorName) : "S";
  const hasArContent = !!(article?.bodyAr || (!article?.bodyEn && article?.body));
  const hasEnContent = !!(article?.bodyEn || (!article?.bodyAr && article?.body));
  const contentLangMatch = language === "ar" ? hasArContent : hasEnContent;

  useEffect(() => {
    if (article) {
      document.title = article.metaTitle || article.title;
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta)
        descMeta.setAttribute("content", article.metaDescription ?? article.excerpt ?? "");
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 py-20 px-4">
          <div className="max-w-5xl mx-auto space-y-4">
            <Skeleton className="h-5 w-32 bg-white/10" />
            <Skeleton className="h-10 w-3/4 bg-white/10" />
            <Skeleton className="h-6 w-1/2 bg-white/10" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Skeleton className="h-72 w-full rounded-2xl mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-10 w-10 text-indigo-300" />
          </div>
          <p className="text-2xl font-bold text-gray-800 mb-2">{t.pub_articleNotFound}</p>
          <p className="text-gray-500 mb-5">{t.pub_articleNotFoundDesc}</p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link href="/blog">{t.pub_backToBlog}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
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
            author: {
              "@type": "Person",
              name: article.authorName ?? "SalesBot AI",
            },
          }),
        }}
      />

      {/* Article Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 py-20">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%)" }}>
        </div>
        <div className="absolute top-1/3 right-1/4 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-indigo-300 hover:text-white hover:bg-white/10 mb-6 gap-1"
          >
            <Link href="/blog">
              <BackArrow className="h-4 w-4" />
              {t.pub_backToBlog}
            </Link>
          </Button>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {article.category && (
              <Badge className="bg-white/15 text-white border-white/20 px-3 py-1">
                {(article.category as ArticleCategory).name}
              </Badge>
            )}
            {article && (
              <Badge className={`text-xs px-2.5 py-0.5 ${contentLangMatch ? "bg-white/10 text-indigo-300 border-white/10" : "bg-amber-400/20 text-amber-300 border-amber-400/20"}`} data-testid="badge-article-lang">
                {language === "ar" ? "AR" : "EN"}
              </Badge>
            )}
            {article.tags?.map((tag) => (
              <Badge
                key={tag}
                className="bg-white/10 text-indigo-200 border-white/10 text-xs px-2.5 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5 max-w-3xl"
            data-testid="text-article-title"
          >
            {article.title}
          </h1>

          <div className="flex items-center gap-4 flex-wrap">
            {article.authorName && (
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{authorInitials}</span>
                </div>
                <span className="text-indigo-200 text-sm font-medium">{article.authorName}</span>
              </div>
            )}
            {article.publishedAt && (
              <span className="flex items-center gap-1.5 text-indigo-300 text-sm">
                <Calendar className="h-4 w-4" />
                {new Date(article.publishedAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            {article.readingTimeMinutes && (
              <span className="flex items-center gap-1.5 text-indigo-300 text-sm">
                <Clock className="h-4 w-4" />
                {article.readingTimeMinutes} {t.pub_readingTime}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Featured Image */}
      {article.featuredImage && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full max-h-96 object-cover rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <article className="lg:col-span-3">
            {article.excerpt && (
              <p className={`text-lg text-gray-600 mb-8 ${isRTL ? "border-r-4 pr-4 rounded-l-lg" : "border-l-4 pl-4 rounded-r-lg"} border-indigo-500 italic leading-relaxed bg-indigo-50 py-3`}>
                {article.excerpt}
              </p>
            )}

            <div
              className="prose prose-lg max-w-none
                prose-headings:font-bold prose-headings:text-gray-900
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900
                prose-ul:text-gray-700 prose-ol:text-gray-700
                prose-li:mb-1
                prose-blockquote:border-indigo-500 prose-blockquote:text-gray-600
                prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:rounded
                prose-pre:bg-gray-900 prose-pre:rounded-xl"
              dangerouslySetInnerHTML={{ __html: processedBody }}
              data-testid="article-content"
            />

            <Separator className="my-10" />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <ShareButtons title={article.title} url={currentUrl} />
            </div>
          </article>

          <aside className="space-y-6">
            <TableOfContents items={toc} />

            {article.authorName && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-sm text-gray-800 mb-4">{t.pub_articleAuthor}</p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{authorInitials}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{article.authorName}</p>
                    <p className="text-xs text-gray-400">{t.pub_authorAt}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="bg-white border-t border-gray-100 py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-1 w-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
              <h2 className="text-xl font-bold text-gray-900">{t.pub_relatedArticles}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((rel) => {
                const relInitials = rel.authorName ? getInitials(rel.authorName) : "S";
                return (
                  <Link key={rel.id} href={`/blog/${rel.slug}`}>
                    <div
                      className="group bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                      data-testid={`card-related-${rel.id}`}
                    >
                      {rel.featuredImage ? (
                        <div className="overflow-hidden h-36">
                          <img
                            src={rel.featuredImage}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="h-36 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-indigo-300" />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="font-semibold text-sm text-gray-800 leading-snug group-hover:text-indigo-600 transition-colors mb-3">
                          {rel.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {rel.authorName && (
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">{relInitials}</span>
                            </div>
                          )}
                          {rel.readingTimeMinutes && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rel.readingTimeMinutes} {t.pub_readingMinutes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
