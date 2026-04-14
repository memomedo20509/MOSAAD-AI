import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CompanyProfile, ChatbotConfig } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({ queryKey: ["/api/company-profile"] });
  const { data: config, isLoading: configLoading } = useQuery<ChatbotConfig>({ queryKey: ["/api/chatbot-config"] });

  const [profileForm, setProfileForm] = useState({ name: "", industry: "", website: "" });
  const [configForm, setConfigForm] = useState({ personaName: "", greeting: "", language: "en", isActive: true });

  useEffect(() => {
    if (profile) {
      setProfileForm({ name: profile.name ?? "", industry: profile.industry ?? "", website: profile.website ?? "" });
    }
  }, [profile]);

  useEffect(() => {
    if (config) {
      setConfigForm({ personaName: config.personaName ?? "SalesBot", greeting: config.greeting ?? "", language: config.language ?? "en", isActive: config.isActive ?? true });
    }
  }, [config]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => apiRequest("PUT", "/api/company-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-profile"] });
      toast({ title: "Company profile updated" });
    },
    onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: typeof configForm) => apiRequest("PUT", "/api/chatbot-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-config"] });
      toast({ title: "Chatbot config updated" });
    },
    onError: () => toast({ title: "Failed to update chatbot config", variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl" data-testid="page-settings">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your company and chatbot</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>Basic information about your company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <div>
                <Label>Company Name</Label>
                <Input data-testid="input-company-name" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="My Company" />
              </div>
              <div>
                <Label>Industry</Label>
                <Input data-testid="input-company-industry" value={profileForm.industry} onChange={e => setProfileForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Real Estate, E-commerce" />
              </div>
              <div>
                <Label>Website</Label>
                <Input data-testid="input-company-website" value={profileForm.website} onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yourcompany.com" />
              </div>
              <Button onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chatbot Configuration</CardTitle>
          <CardDescription>Customize your AI sales assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <div>
                <Label>Bot Name</Label>
                <Input data-testid="input-bot-name" value={configForm.personaName} onChange={e => setConfigForm(f => ({ ...f, personaName: e.target.value }))} placeholder="SalesBot" />
              </div>
              <div>
                <Label>Greeting Message</Label>
                <Textarea data-testid="input-bot-greeting" value={configForm.greeting} onChange={e => setConfigForm(f => ({ ...f, greeting: e.target.value }))} placeholder="Hello! How can I help you today?" rows={3} />
              </div>
              <div>
                <Label>Language</Label>
                <Select value={configForm.language} onValueChange={v => setConfigForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger data-testid="select-bot-language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={configForm.isActive} onCheckedChange={v => setConfigForm(f => ({ ...f, isActive: v }))} data-testid="switch-bot-active" />
                <Label>Bot Active</Label>
              </div>
              <Button onClick={() => updateConfigMutation.mutate(configForm)} disabled={updateConfigMutation.isPending} data-testid="button-save-config">
                {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
