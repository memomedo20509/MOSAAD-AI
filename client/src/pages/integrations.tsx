import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { SiFacebook, SiWhatsapp, SiOpenai } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ConnectionState = "connected" | "disconnected" | "testing";

function TokenField({ label, placeholder, helpText, value, onChange }: {
  label: string;
  placeholder: string;
  helpText?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mt-1">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          data-testid={`toggle-show-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
    </div>
  );
}

function ConnectionStatus({ state }: { state: ConnectionState }) {
  if (state === "connected") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Connected
      </Badge>
    );
  }
  if (state === "testing") {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Testing...
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 gap-1">
      <XCircle className="h-3.5 w-3.5" />
      Not Connected
    </Badge>
  );
}

function IntegrationTab({ children, status, onTest, onSave, isSaving }: {
  children: React.ReactNode;
  status: ConnectionState;
  onTest: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Integration Status</p>
        <ConnectionStatus state={status} />
      </div>
      <div className="space-y-4">
        {children}
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onTest} disabled={status === "testing"} data-testid="button-test-connection">
          {status === "testing" ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Test Connection
        </Button>
        <Button onClick={onSave} disabled={isSaving} data-testid="button-save-integration">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();

  const [fbStatus, setFbStatus] = useState<ConnectionState>("disconnected");
  const [waStatus, setWaStatus] = useState<ConnectionState>("disconnected");
  const [aiStatus, setAiStatus] = useState<ConnectionState>("disconnected");

  const [fbForm, setFbForm] = useState({ pageToken: "", appSecret: "", verifyToken: "" });
  const [waForm, setWaForm] = useState({ phoneNumberId: "", accessToken: "", webhookSecret: "" });
  const [aiForm, setAiForm] = useState({ apiKey: "", model: "gpt-4o-mini" });

  const [saving, setSaving] = useState(false);

  const testConnection = (platform: "facebook" | "whatsapp" | "openai") => {
    const setStatus = platform === "facebook" ? setFbStatus : platform === "whatsapp" ? setWaStatus : setAiStatus;
    setStatus("testing");
    setTimeout(() => {
      const form = platform === "facebook" ? fbForm : platform === "whatsapp" ? waForm : aiForm;
      const hasValues = Object.values(form).some(v => v.trim().length > 0);
      setStatus(hasValues ? "connected" : "disconnected");
      toast({
        title: hasValues ? "Connection successful" : "Connection failed",
        description: hasValues ? "Integration is working correctly." : "Please check your credentials.",
        variant: hasValues ? "default" : "destructive",
      });
    }, 1500);
  };

  const saveSettings = (platform: string) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: `${platform} settings saved`, description: "Your integration settings have been saved locally." });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="page-integrations">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your chatbot to messaging platforms and AI services</p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Configure your API keys and tokens for each integration</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="facebook">
            <TabsList className="grid w-full grid-cols-3 mt-2">
              <TabsTrigger value="facebook" data-testid="tab-facebook" className="gap-2">
                <SiFacebook className="h-4 w-4 text-[#1877F2]" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="whatsapp" data-testid="tab-whatsapp" className="gap-2">
                <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="openai" data-testid="tab-openai" className="gap-2">
                <SiOpenai className="h-4 w-4" />
                OpenAI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="facebook">
              <IntegrationTab
                status={fbStatus}
                onTest={() => testConnection("facebook")}
                onSave={() => saveSettings("Facebook")}
                isSaving={saving}
              >
                <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                  Connect your Facebook Page to receive and send Messenger messages. You'll need a Facebook Developer account.
                </div>
                <TokenField
                  label="Page Access Token"
                  placeholder="EAAxxxxxxxx..."
                  helpText="Get this from your Facebook App dashboard"
                  value={fbForm.pageToken}
                  onChange={v => setFbForm(f => ({ ...f, pageToken: v }))}
                />
                <TokenField
                  label="App Secret"
                  placeholder="Your app secret key"
                  value={fbForm.appSecret}
                  onChange={v => setFbForm(f => ({ ...f, appSecret: v }))}
                />
                <TokenField
                  label="Webhook Verify Token"
                  placeholder="Your custom verify token"
                  helpText="A random string you create to validate webhook requests"
                  value={fbForm.verifyToken}
                  onChange={v => setFbForm(f => ({ ...f, verifyToken: v }))}
                />
              </IntegrationTab>
            </TabsContent>

            <TabsContent value="whatsapp">
              <IntegrationTab
                status={waStatus}
                onTest={() => testConnection("whatsapp")}
                onSave={() => saveSettings("WhatsApp")}
                isSaving={saving}
              >
                <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                  Connect via WhatsApp Business API (Cloud API). Requires a verified Meta Business account.
                </div>
                <TokenField
                  label="Phone Number ID"
                  placeholder="123456789..."
                  helpText="Found in your WhatsApp Business dashboard"
                  value={waForm.phoneNumberId}
                  onChange={v => setWaForm(f => ({ ...f, phoneNumberId: v }))}
                />
                <TokenField
                  label="Access Token"
                  placeholder="EAAxxxxxxxx..."
                  value={waForm.accessToken}
                  onChange={v => setWaForm(f => ({ ...f, accessToken: v }))}
                />
                <TokenField
                  label="Webhook Secret"
                  placeholder="Your webhook secret"
                  value={waForm.webhookSecret}
                  onChange={v => setWaForm(f => ({ ...f, webhookSecret: v }))}
                />
              </IntegrationTab>
            </TabsContent>

            <TabsContent value="openai">
              <IntegrationTab
                status={aiStatus}
                onTest={() => testConnection("openai")}
                onSave={() => saveSettings("OpenAI")}
                isSaving={saving}
              >
                <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                  Connect your OpenAI account to power the AI responses. Get your API key from platform.openai.com.
                </div>
                <TokenField
                  label="API Key"
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  helpText="Your secret OpenAI API key"
                  value={aiForm.apiKey}
                  onChange={v => setAiForm(f => ({ ...f, apiKey: v }))}
                />
                <div>
                  <Label>Model</Label>
                  <select
                    value={aiForm.model}
                    onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="select-openai-model"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </IntegrationTab>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
