'use client';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    // Check if already signed in
    authClient.getSession().then((session) => {
      if (session.data) {
        router.push(callbackUrl);
      }
    });
  }, [router, callbackUrl]);

  const handleSignIn = async () => {
    try {
      await authClient.signIn.oauth2({
        providerId: 'harvest',
        callbackURL: callbackUrl,
        errorCallbackURL: '/auth-error',
      });
    } catch (error) {
      console.error('Sign in error:', error);
      // Redirect to error page with generic error
      window.location.href = '/auth-error?error=unknown';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            PMO Harvest Portal
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Sign in with your Harvest account to track your time and expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSignIn}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            Sign in with Harvest
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            This portal is for PMO Hive consultants. Your Harvest account credentials are used for authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
