import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient, customSessionClient } from 'better-auth/client/plugins';
import type { auth } from '@/lib/auth';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [genericOAuthClient(), customSessionClient<typeof auth>()],
});

export const { useSession, signIn, signOut, signUp } = authClient;

// Export Better Auth's inferred session type as the source of truth
export type Session = typeof authClient.$Infer.Session;
