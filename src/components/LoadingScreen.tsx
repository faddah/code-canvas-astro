import { Loader2 } from "lucide-react";

export function LoadingScreen({ showRetry = false }: { showRetry?: boolean }) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-background text-primary">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-muted-foreground font-mono animate-pulse">
                Initializing Environment...
                </p>
                {showRetry && (
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                    Taking too long? Click to reload
                </button>
                )}
            </div>
        </div>
    );
}
