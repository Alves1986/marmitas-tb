import { loadSessionUser, type SessionLookupClient, type SessionUser } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = useCallback(async () => {
    try {
      setError(null);
      const nextUser = await loadSessionUser(supabase as unknown as SessionLookupClient);
      setUser(nextUser);
      return nextUser;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Não foi possível verificar a sessão");
      setError(nextError);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      if (mounted) void loadUser();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(new Error(signOutError.message));
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading || user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    window.location.href = redirectPath ?? "/acesso";
  }, [loading, redirectOnUnauthenticated, redirectPath, user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refresh: loadUser,
    logout,
  };
}
