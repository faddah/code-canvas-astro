import { QueryProvider } from '@/components/QueryProvider';
import IDE from '@/components/IDE';
import { Toaster } from '@/components/ui/toaster';

/**
 * Main App component that wraps the IDE with all necessary providers.
 * This entire component renders only on the client (no SSR).
 */
export default function App() {
  return (
    <QueryProvider>
      <IDE />
      <Toaster />
    </QueryProvider>
  );
}
