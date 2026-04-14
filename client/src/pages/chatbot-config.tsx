import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Bot, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatbotConfig } from "@shared/schema";
import { cn } from "@/lib/utils";

const DEFAULT_QUESTIONS = [
  "What's your name?",
  "What's your phone number?",
  "What are you interested in?",
];

export default function ChatbotConfigPage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useQuery<ChatbotConfig>({ queryKey: ["/api/chatbot-config"] });

  const [form, setForm] = useState({
    personaName: "SalesBot",
    greeting: "Hello! How can I help you today?",
    language: "en",
    isActive: true,
    leadQuestions: DEFAULT_QUESTIONS,
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (config) {
      setForm({
        personaName: config.personaName ?? "SalesBot",
        greeting: config.greeting ?? "Hello! How can I help you today?",
        language: config.language ?? "en",
        isActive: config.isActive ?? true,
        leadQuestions: (config.leadQuestions as string[] | null) ?? DEFAULT_QUESTIONS,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("PUT", "/api/chatbot-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-config"] });
      toast({ title: "Chatbot configuration saved" });
    },
    onError: () => toast({ title: "Failed to save configuration", variant: "destructive" }),
  });

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    setForm(f => ({ ...f, leadQuestions: [...f.leadQuestions, q] }));
    setNewQuestion("");
  };

  const removeQuestion = (idx: number) => {
    setForm(f => ({ ...f, leadQuestions: f.leadQuestions.filter((_, i) => i !== idx) }));
  };

  const moveQuestion = (from: number, to: number) => {
    setForm(f => {
      const arr = [...f.leadQuestions];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...f, leadQuestions: arr };
    });
  };

  const previewMessages = [
    { role: "bot", content: form.greeting || "Hello! How can I help you today?" },
    { role: "user", content: "Hi, I'm interested in your products." },
    ...(form.leadQuestions.slice(0, 2).map(q => ({ role: "bot", content: q }))),
    ...(form.leadQuestions.length > 0 ? [{ role: "user", content: "Sure, happy to share!" }] : []),
  ];

  return (
    <div className="space-y-6" data-testid="page-chatbot-config">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chatbot Configuration</h1>
          <p className="text-muted-foreground">Customize your AI sales assistant persona and behavior</p>
        </div>
        <Button
          onClick={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
          data-testid="button-save-config"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Persona</CardTitle>
              <CardDescription>Define how your chatbot presents itself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="bot-name">Bot Name</Label>
                    <Input
                      id="bot-name"
                      data-testid="input-bot-name"
                      value={form.personaName}
                      onChange={e => setForm(f => ({ ...f, personaName: e.target.value }))}
                      placeholder="SalesBot"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-greeting">Greeting Message</Label>
                    <Textarea
                      id="bot-greeting"
                      data-testid="input-bot-greeting"
                      value={form.greeting}
                      onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
                      placeholder="Hello! How can I help you today?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-language">Language</Label>
                    <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                      <SelectTrigger id="bot-language" data-testid="select-bot-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">Arabic (العربية)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="both">Both (Arabic & English)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="bot-active"
                      checked={form.isActive}
                      onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                      data-testid="switch-bot-active"
                    />
                    <Label htmlFor="bot-active">Bot Active</Label>
                    <Badge className={form.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }>
                      {form.isActive ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Capture Questions</CardTitle>
              <CardDescription>Questions the bot asks to capture lead information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {form.leadQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={() => { if (dragIdx !== null && dragIdx !== idx) moveQuestion(dragIdx, idx); setDragIdx(null); }}
                    className={cn(
                      "flex items-center gap-2 rounded-md border bg-card px-3 py-2 cursor-move",
                      dragIdx === idx && "opacity-50"
                    )}
                    data-testid={`question-item-${idx}`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm">{q}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeQuestion(idx)}
                      data-testid={`button-remove-question-${idx}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  placeholder="Add a custom question..."
                  data-testid="input-new-question"
                  onKeyDown={e => { if (e.key === "Enter") addQuestion(); }}
                />
                <Button variant="outline" onClick={addQuestion} data-testid="button-add-question">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle>Conversation Preview</CardTitle>
              </div>
              <CardDescription>How your bot interacts with contacts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3 max-h-[500px] overflow-y-auto">
                <div className="flex items-center gap-2 pb-2 border-b mb-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{form.personaName || "SalesBot"}</p>
                    <p className="text-xs text-muted-foreground">AI Assistant</p>
                  </div>
                </div>
                {previewMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "bot" && (
                      <div className="flex items-end gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 mb-0.5">
                          <MessageSquare className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="bg-card rounded-xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%] shadow-sm border">
                          {msg.content}
                        </div>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-3 py-2 text-sm max-w-[85%]">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
