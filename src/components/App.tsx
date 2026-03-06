import { ClerkProvider } from '@clerk/react';
import { QueryProvider } from '@/components/QueryProvider';
import IDE from '@/components/IDE';
import { Toaster } from '@/components/ui/toaster';

/**
 * Main App component that wraps the IDE with all necessary providers.
 * This entire component renders only on the client (no SSR).
 */
export default function App() {
  const clerkPubKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

  console.log('[App] PUBLIC_CLERK_PUBLISHABLE_KEY:', clerkPubKey ? `${clerkPubKey.substring(0, 15)}...` : '(empty)');

  // If Clerk keys aren't configured, render without auth (graceful degradation)
  if (!clerkPubKey || clerkPubKey === 'pk_test_REPLACE_ME') {
    console.log('[App] Clerk key missing or placeholder — rendering WITHOUT ClerkProvider');
    return (
      <QueryProvider>
        <IDE />
        <Toaster />
      </QueryProvider>
    );
  }

  console.log('[App] Rendering WITH ClerkProvider');
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryProvider>
        <IDE />
        <Toaster />
      </QueryProvider>
    </ClerkProvider>
  );
}
