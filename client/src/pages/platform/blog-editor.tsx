import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TipTapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Bold, Italic, UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading2, Heading3, Quote, Code, Link2, Image as ImageIcon, Save, Eye, CheckCircle } from "lucide-react";
import type { Article, ArticleCategory } from "@shared/schema";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/--+/g, "-")
    .trim();
}

function countWords(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

function hasInternalLinks(html: string) {
  const matches = html.match(/href="[^"]+"/g) ?? [];
  return matches.some(href => !href.includes("://") || href.includes(window.location.hostname));
}

function hasAltText(html: string) {
  const imgs = html.match(/<img[^>]+>/g) ?? [];
  if (imgs.length === 0) return true;
  return imgs.every(img => /alt="[^"]+"/i.test(img));
}

function hasHeadingStructure(html: string) {
  return /<h[23][^>]*>/i.test(html);
}

interface SeoCheck {
  label: string;
  passed: boolean;
  weight: number;
}

function computeSeoScore(title: string, metaDesc: string, body: string): { score: number; checks: SeoCheck[] } {
  const wordCount = countWords(body);
  const metaLen = metaDesc.length;

  const checks: SeoCheck[] = [
    { label: "العنوان لا يقل عن 10 أحرف", passed: title.length >= 10, weight: 15 },
    { label: `Meta Description بين 120-160 حرف (${metaLen})`, passed: metaLen >= 120 && metaLen <= 160, weight: 20 },
    { label: `عدد الكلمات أكثر من 800 (${wordCount})`, passed: wordCount >= 800, weight: 20 },
    { label: "يحتوي على روابط داخلية", passed: hasInternalLinks(body), weight: 15 },
    { label: "الصور لها نص بديل (alt)", passed: hasAltText(body), weight: 15 },
    { label: "يحتوي على عناوين H2 أو H3", passed: hasHeadingStructure(body), weight: 15 },
  ];
  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  return { score, checks };
}

function SeoScorePanel({ title, metaDesc, body }: { title: string; metaDesc: string; body: string }) {
  const { score, checks } = computeSeoScore(title, metaDesc, body);
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  const bgColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>تقييم SEO</span>
          <span className={`text-2xl font-bold ${color}`} data-testid="text-seo-score">{score}/100</span>
        </CardTitle>
        <div className="w-full bg-muted rounded-full h-2">
          <div className={`${bgColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${check.passed ? "bg-green-500" : "bg-red-400"}`} />
            <span className={check.passed ? "text-muted-foreground" : ""}>{check.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const toolbarBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 rounded-t-md">
      {toolbarBtn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />, "Bold")}
      {toolbarBtn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />, "Italic")}
      {toolbarBtn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-3.5 w-3.5" />, "Underline")}
      <Separator orientation="vertical" className="h-8" />
      {toolbarBtn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, "H2")}
      {toolbarBtn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />, "H3")}
      <Separator orientation="vertical" className="h-8" />
      {toolbarBtn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, "Bullet List")}
      {toolbarBtn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, "Ordered List")}
      {toolbarBtn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-3.5 w-3.5" />, "Blockquote")}
      {toolbarBtn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), <Code className="h-3.5 w-3.5" />, "Code Block")}
      <Separator orientation="vertical" className="h-8" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Link"
        onClick={() => {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Image"
        onClick={() => {
          const url = window.prompt("Image URL");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </Button>
      <Separator orientation="vertical" className="h-8" />
      {toolbarBtn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), <AlignLeft className="h-3.5 w-3.5" />, "Align Left")}
      {toolbarBtn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), <AlignCenter className="h-3.5 w-3.5" />, "Align Center")}
      {toolbarBtn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), <AlignRight className="h-3.5 w-3.5" />, "Align Right")}
    </div>
  );
}

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  categoryId: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  status: string;
}

export default function BlogEditorPage({ params }: { params?: { id?: string } }) {
  const articleId = params?.id;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>({
    title: "",
    slug: "",
    excerpt: "",
    featuredImage: "",
    categoryId: "",
    tags: "",
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    status: "draft",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { data: categories = [] } = useQuery<ArticleCategory[]>({
    queryKey: ["/api/platform/blog/categories"],
  });

  const { data: existingArticle, isLoading: loadingArticle } = useQuery<Article>({
    queryKey: ["/api/platform/blog/articles", articleId],
    queryFn: () => fetch(`/api/platform/blog/articles/${articleId}`).then(r => r.json()),
    enabled: !!articleId,
  });

  useEffect(() => {
    if (existingArticle) {
      setForm({
        title: existingArticle.title,
        slug: existingArticle.slug,
        excerpt: existingArticle.excerpt ?? "",
        featuredImage: existingArticle.featuredImage ?? "",
        categoryId: existingArticle.categoryId ?? "",
        tags: (existingArticle.tags ?? []).join(", "),
        metaTitle: existingArticle.metaTitle ?? "",
        metaDescription: existingArticle.metaDescription ?? "",
        ogImage: existingArticle.ogImage ?? "",
        status: existingArticle.status,
      });
      setSlugManuallyEdited(true);
      if (existingArticle.body) {
        editor?.commands.setContent(existingArticle.body);
      }
    }
  }, [existingArticle]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      TipTapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "اكتب محتوى مقالك هنا..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert max-w-none min-h-[400px] p-4 focus:outline-none",
        dir: "rtl",
      },
    },
  });

  useEffect(() => {
    if (existingArticle?.body && editor && !editor.isDestroyed) {
      editor.commands.setContent(existingArticle.body);
    }
  }, [existingArticle?.body, editor]);

  const body = editor?.getHTML() ?? "";
  const wordCount = countWords(body);
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, slug: slugManuallyEdited ? f.slug : slugify(title) }));
  };

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (articleId) {
        return apiRequest("PATCH", `/api/platform/blog/articles/${articleId}`, data);
      }
      return apiRequest("POST", "/api/platform/blog/articles", data);
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/blog/articles"] });
      const savedArticle = await res.json();
      toast({ title: articleId ? "تم حفظ المقال" : "تم إنشاء المقال" });
      if (!articleId) {
        setLocation(`/platform/blog/editor/${savedArticle.id}`);
      }
    },
    onError: () => toast({ title: "خطأ", description: "فشل حفظ المقال", variant: "destructive" }),
  });

  function buildPayload(statusOverride?: string) {
    const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    return {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt || undefined,
      body,
      featuredImage: form.featuredImage || undefined,
      categoryId: form.categoryId || undefined,
      tags,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      ogImage: form.ogImage || undefined,
      status: statusOverride ?? form.status,
      readingTimeMinutes: readingTime,
      publishedAt: (statusOverride === "published" || form.status === "published") ? new Date().toISOString() : undefined,
    };
  }

  function handleSave() {
    saveMutation.mutate(buildPayload());
  }

  function handlePublish() {
    saveMutation.mutate(buildPayload("published"));
  }

  if (loadingArticle) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/platform/blog"><ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold">{articleId ? "تعديل المقال" : "مقال جديد"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-draft">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
            حفظ كمسودة
          </Button>
          <Button onClick={handlePublish} disabled={saveMutation.isPending} data-testid="button-publish">
            <CheckCircle className="h-4 w-4 ml-2" />
            نشر
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المقال *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="أدخل عنوان المقال..."
                  className="text-lg font-semibold"
                  data-testid="input-article-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={e => { setForm(f => ({ ...f, slug: e.target.value })); setSlugManuallyEdited(true); }}
                  dir="ltr"
                  placeholder="article-slug"
                  data-testid="input-article-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">المقتطف</Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  rows={2}
                  placeholder="ملخص قصير للمقال..."
                  data-testid="input-article-excerpt"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>المحتوى</span>
                <span className="text-xs font-normal text-muted-foreground">{wordCount} كلمة | {readingTime} دقيقة</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="border rounded-md overflow-hidden">
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} data-testid="editor-content" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">إعدادات SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={form.metaTitle}
                  onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))}
                  placeholder="عنوان لمحركات البحث..."
                  data-testid="input-meta-title"
                />
                <p className="text-xs text-muted-foreground">{form.metaTitle.length}/60 حرف</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-desc">Meta Description</Label>
                <Textarea
                  id="meta-desc"
                  value={form.metaDescription}
                  onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))}
                  rows={3}
                  placeholder="وصف لمحركات البحث (120-160 حرف)..."
                  data-testid="input-meta-description"
                />
                <p className={`text-xs ${form.metaDescription.length >= 120 && form.metaDescription.length <= 160 ? "text-green-600" : "text-muted-foreground"}`}>
                  {form.metaDescription.length}/160 حرف
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="og-image">OG Image URL</Label>
                <Input
                  id="og-image"
                  value={form.ogImage}
                  onChange={e => setForm(f => ({ ...f, ogImage: e.target.value }))}
                  dir="ltr"
                  placeholder="https://..."
                  data-testid="input-og-image"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <SeoScorePanel title={form.title} metaDesc={form.metaDescription} body={body} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">إعدادات المقال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="اختر تصنيفاً..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون تصنيف</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">الوسوم (مفصولة بفاصلة)</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="chatbot, automation, AI"
                  data-testid="input-tags"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featured-image">الصورة البارزة URL</Label>
                <Input
                  id="featured-image"
                  value={form.featuredImage}
                  onChange={e => setForm(f => ({ ...f, featuredImage: e.target.value }))}
                  dir="ltr"
                  placeholder="https://..."
                  data-testid="input-featured-image"
                />
                {form.featuredImage && (
                  <img src={form.featuredImage} alt="Preview" className="rounded-md w-full h-32 object-cover mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="published">منشور</SelectItem>
                    <SelectItem value="archived">مؤرشف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
