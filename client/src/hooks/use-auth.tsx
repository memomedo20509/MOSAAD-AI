import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { User, RolePermissions } from "@shared/models/auth";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type UserWithPermissions = User & { permissions?: RolePermissions; companyBusinessType?: string | null };

type AuthContextType = {
  user: UserWithPermissions | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithPermissions, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithPermissions, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithPermissions | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (user: UserWithPermissions) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: t.loginSuccess,
        description: `${t.loginWelcome} ${user.firstName || user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.loginFailed,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: async (user: UserWithPermissions) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: t.registerSuccess,
        description: `${t.loginWelcome} ${user.firstName || user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.registerFailed,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: t.logoutSuccess,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.logoutFailed,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
