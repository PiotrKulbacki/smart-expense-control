'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SafeUser } from '@web/features/auth/types';

const AppUserContext = createContext<SafeUser | null>(null);

type AppUserProviderProps = {
  user: SafeUser;
  children: ReactNode;
};

export function AppUserProvider({ user, children }: AppUserProviderProps) {
  return <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>;
}

export function useAppUser(): SafeUser {
  const user = useContext(AppUserContext);

  if (!user) {
    throw new Error('useAppUser must be used within AppUserProvider');
  }

  return user;
}
