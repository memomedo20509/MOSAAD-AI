import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, User as UserIcon, Lock, Mail, Phone, Link as LinkIcon } from "lucide-react";
import type { User } from "@shared/models/auth";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImageUrl: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

function AvatarPreview({ user, firstName, lastName, profileImageUrl }: { user: User; firstName: string; lastName: string; profileImageUrl: string }) {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || user.username?.[0]?.toUpperCase() || "?";
  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={firstName || user.username}
        className="h-20 w-20 rounded-full object-cover border-2 border-border"
        data-testid="img-profile-avatar"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold border-2 border-border"
      data-testid="text-profile-initials"
    >
      {initials}
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<User & { lastLogin?: string | null; companyBusinessType?: string }>({
    queryKey: ["/api/user"],
  });

  const profileForm = useForm<ProfileForm>({
    values: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      profileImageUrl: user?.profileImageUrl ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const previewFirstName = profileForm.watch("firstName");
  const previewLastName = profileForm.watch("lastName");
  const previewImageUrl = profileForm.watch("profileImageUrl");

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      apiRequest("PATCH", "/api/user/profile", {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email || null,
        phone: data.phone || null,
        profileImageUrl: data.profileImageUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: t.profileUpdated });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t.profileUpdateError;
      toast({ title: t.profileUpdateError, description: msg, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/user/change-password", data),
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: t.passwordChangedSuccess });
    },
    onError: (err: unknown) => {
      const errBody = err instanceof Error ? err.message : "";
      if (errBody.includes("Wrong current password") || errBody.toLowerCase().includes("wrong")) {
        toast({ title: t.wrongCurrentPassword, variant: "destructive" });
      } else {
        toast({ title: t.passwordChangeError, variant: "destructive" });
      }
    },
  });

  function onProfileSubmit(data: ProfileForm) {
    profileMutation.mutate(data);
  }

  function onPasswordSubmit(data: PasswordForm) {
    if (data.newPassword.length < 6) {
      passwordForm.setError("newPassword", { message: t.passwordMinLength6 });
      return;
    }
    if (data.newPassword !== data.confirmNewPassword) {
      passwordForm.setError("confirmNewPassword", { message: t.passwordsDoNotMatch });
      return;
    }
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const roleDisplayMap: Record<string, string> = {
    platform_admin: t.roleLabPlatformAdmin,
    super_admin: t.roleLabSuperAdmin,
    company_owner: t.roleLabCompanyOwner,
    sales_admin: t.roleLabSalesAdmin,
    team_leader: t.roleLabTeamLeader,
    sales_agent: t.roleLabSalesAgent,
    admin: t.roleLabAdmin,
    sales_manager: t.roleLabSalesManager,
  };

  const lastLoginDisplay = user.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : t.noLastLogin;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <h1 className="text-2xl font-bold" data-testid="text-profile-title">{t.myProfile}</h1>

      <div className="flex items-center gap-4">
        {user && (
          <AvatarPreview
            user={user}
            firstName={previewFirstName}
            lastName={previewLastName}
            profileImageUrl={previewImageUrl}
          />
        )}
        <div>
          <div className="font-semibold text-lg" data-testid="text-profile-displayname">
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
          </div>
          <div className="text-sm text-muted-foreground" data-testid="text-profile-role">
            {roleDisplayMap[user.role ?? ""] ?? user.role}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="h-4 w-4" />
            {t.accountInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">{t.username}</div>
            <div className="font-medium" data-testid="text-profile-username">{user.username}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t.role}</div>
            <div className="font-medium">{roleDisplayMap[user.role ?? ""] ?? user.role}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t.team}</div>
            <div className="font-medium" data-testid="text-profile-team">{user.teamId ?? t.noTeam}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t.lastLogin}</div>
            <div className="font-medium" data-testid="text-profile-lastlogin">{lastLoginDisplay}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            {t.personalInfo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">{t.firstName}</Label>
                <Input
                  id="firstName"
                  {...profileForm.register("firstName")}
                  placeholder={t.firstName}
                  data-testid="input-profile-firstname"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">{t.lastName}</Label>
                <Input
                  id="lastName"
                  {...profileForm.register("lastName")}
                  placeholder={t.lastName}
                  data-testid="input-profile-lastname"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />{t.email}
              </Label>
              <Input
                id="email"
                type="email"
                {...profileForm.register("email")}
                placeholder={t.profileEmailPlaceholder}
                data-testid="input-profile-email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />{t.phone}
              </Label>
              <Input
                id="phone"
                {...profileForm.register("phone")}
                placeholder={t.profilePhonePlaceholder}
                data-testid="input-profile-phone"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profileImageUrl" className="flex items-center gap-1">
                <LinkIcon className="h-3.5 w-3.5" />{t.profilePictureUrl}
              </Label>
              <Input
                id="profileImageUrl"
                {...profileForm.register("profileImageUrl")}
                placeholder={t.profileImageUrlPlaceholder}
                data-testid="input-profile-imageurl"
              />
            </div>
            <Button
              type="submit"
              disabled={profileMutation.isPending}
              data-testid="button-save-profile"
            >
              {profileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            {t.changePassword}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">{t.currentPassword}</Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register("currentPassword", { required: true })}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">{t.newPassword}</Label>
              <Input
                id="newPassword"
                type="password"
                {...passwordForm.register("newPassword", { required: true })}
                data-testid="input-new-password"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive" data-testid="error-new-password">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmNewPassword">{t.confirmNewPassword}</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                {...passwordForm.register("confirmNewPassword", { required: true })}
                data-testid="input-confirm-password"
              />
              {passwordForm.formState.errors.confirmNewPassword && (
                <p className="text-xs text-destructive" data-testid="error-confirm-password">
                  {passwordForm.formState.errors.confirmNewPassword.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              data-testid="button-change-password"
            >
              {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.changePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
