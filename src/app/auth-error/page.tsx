'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, { title: string; description: string; action?: string }> = {
  access_denied: {
    title: 'Access Denied',
    description: 'You denied the authentication request. To use this portal, you need to authorize access to your Harvest account.',
    action: 'Please try signing in again and approve the access request.',
  },
  invalid_state: {
    title: 'Invalid State',
    description: 'The authentication state was invalid. This may be due to an expired session or security issue.',
    action: 'Please try signing in again from the beginning.',
  },
  server_error: {
    title: 'Server Error',
    description: 'Harvest OAuth server encountered an error. This is usually temporary.',
    action: 'Please try again in a few moments.',
  },
  session_expired: {
    title: 'Session Expired',
    description: 'Your session has expired and your Harvest access token could not be refreshed.',
    action: 'Please sign in again to continue.',
  },
  token_refresh_failed: {
    title: 'Token Refresh Failed',
    description: 'We could not refresh your Harvest access token. Your refresh token may have expired.',
    action: 'Please sign in again to get a new access token.',
  },
  no_harvest_account: {
    title: 'No Harvest Account Found',
    description: 'You do not appear to have a Harvest account in the PMO Hive organization.',
    action: 'Please contact your administrator to be added to the Harvest account.',
  },
  unauthorized: {
    title: 'Unauthorized',
    description: 'You are not authorized to access this application.',
    action: 'Please contact your administrator if you believe this is an error.',
  },
  unknown: {
    title: 'Authentication Error',
    description: 'An unknown error occurred during authentication.',
    action: 'Please try again or contact support if the problem persists.',
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') || 'unknown';
  const errorDescription = searchParams.get('error_description');

  const error = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold">{error.title}</CardTitle>
          <CardDescription className="mt-2 text-base">
            {errorDescription || error.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.action && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-200">
              <p className="font-medium">What to do next:</p>
              <p className="mt-1">{error.action}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full" size="lg">
              <Link href="/sign-in">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
          </div>

          <div className="mt-6 border-t pt-4">
            <p className="text-xs text-center text-muted-foreground">
              Need help? Contact{' '}
              <a
                href="mailto:support@pmohive.com"
                className="font-medium text-primary hover:underline"
              >
                support@pmohive.com
              </a>
            </p>
            {errorCode !== 'unknown' && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Error Code: <code className="font-mono">{errorCode}</code>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
