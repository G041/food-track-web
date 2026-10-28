import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, type Profile, type Session } from '@/lib/api';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** true hasta saber si hay sesión guardada */
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  isAdmin: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getSession().then((s) => {
      setSession(s);
      setIsLoading(false);
    });
    return api.onSessionChange((s) => {
      setSession(s);
      // lo que ve cada usuario depende de la sesión (aportes propios, cola de admin)
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    });
  }, [queryClient]);

  const { data: profile = null } = useQuery({
    queryKey: ['profile', session?.userId],
    queryFn: () => (session ? api.getProfile(session.userId) : null),
    enabled: !!session,
  });

  const value: AuthContextValue = {
    session,
    profile: session ? profile : null,
    isAdmin: !!session && profile?.role === 'admin',
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
