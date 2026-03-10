import { QueryProvider } from '@/components/QueryProvider';
import IDE from '@/components/IDE';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Main App component that wraps the IDE with all necessary providers.
 * Clerk is initialized by the @clerk/astro integration (not ClerkProvider).
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <IDE />
        <Toaster />
      </QueryProvider>
    </ErrorBoundary>
  );
}
