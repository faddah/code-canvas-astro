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

  // If Clerk keys aren't configured, render without auth (graceful degradation)
  if (!clerkPubKey || clerkPubKey === 'pk_test_REPLACE_ME') {
    return (
      <QueryProvider>
        <IDE />
        <Toaster />
      </QueryProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryProvider>
        <IDE />
        <Toaster />
      </QueryProvider>
    </ClerkProvider>
  );
}
