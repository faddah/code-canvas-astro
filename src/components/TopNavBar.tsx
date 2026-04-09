import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton, SignOutButton } from "@clerk/astro/react";
import { Loader2, Play, Save, SaveAll, FolderOpen, Code2, LogOut, LogIn, UserPlus, User } from "lucide-react";
import { version } from "../../package.json";

export interface ClerkUser {
    id: string;
    primaryEmailAddress?: { emailAddress?: string | null} | null;
}

export interface TopNavBarProps {
    isSignedIn: boolean;
    isReady: boolean;
    isRunning: boolean;
    activeFileId: number | null;
    activeContent: string | null;
    unsavedChanges: Record<number, string>;
    user: ClerkUser | null;
    onRun: () => void;
    onQuickSave: () => void;
    onSaveAsClick: () => void;
    onImportClick: () => void;
    onProfileClick: () => void;
} 

export default function TopNavBar({
    isSignedIn,
    isReady,
    isRunning,
    activeFileId,
    unsavedChanges,
    user,
    onRun,
    onQuickSave,
    onSaveAsClick,
    onImportClick,
    onProfileClick,
}: TopNavBarProps): JSX.Element {

    const userId = user?.id;

    /* Top Navigation Bar */
    return (
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur px-4 flex items-center justify-between shrink-0 z-50">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
                    <div className="bg-primary/20 p-1.5 rounded-md">
                        <Code2 className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-mono text-lg hidden md:block">Python REPL IDE</span>
                </div>

                <div className="h-6 w-px bg-border mx-2 hidden md:block" />

                {/* Toolbar Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={onRun}
                        disabled={!isReady || isRunning || !activeFileId}
                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                        Run
                    </Button>

                    {isSignedIn && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onQuickSave()}
                            disabled={!activeFileId}
                            className={unsavedChanges[activeFileId || 0] ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" : ""}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSaveAsClick()}
                            disabled={!activeFileId}
                        >
                            <SaveAll className="w-4 h-4 mr-2" />
                            Save As
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onImportClick()}
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Open / Import
                        </Button>
                    </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Auth banner / buttons */}
                {!isSignedIn ? (
                    <>
                    <span className="text-xs px-3 py-1.5 rounded-full hidden lg:block border" style={{ color: '#33ff33', backgroundColor: '#0a0a0a', borderColor: '#33ff33', textShadow: '0 0 6px #33ff33' }}>
                        Files cannot be saved unless you create &amp; use a Python REPL IDE User account
                    </span>
                    <SignUpButton mode="modal">
                        <Button size="sm" variant="outline" className="gap-1.5">
                            <UserPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Create An Account</span>
                        </Button>
                    </SignUpButton>
                    <SignInButton mode="modal">
                        <Button size="sm" className="gap-1.5">
                            <LogIn className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Log In</span>
                        </Button>
                    </SignInButton>
                    </>
                ) : (
                    <>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onProfileClick()}
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden md:flex"
                    >
                        <User className="w-3.5 h-3.5" />
                        {user?.primaryEmailAddress?.emailAddress}
                    </Button>
                    <SignOutButton>
                        <Button size="sm" variant="outline" className="gap-1.5">
                            <LogOut className="w-3.5 h-3.5" />
                            Log Out
                        </Button>
                    </SignOutButton>
                    </>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full ${isReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                    {isReady ? `Environment Ready          Version ${version}` : "Loading Python..."}
                </div>
            </div>
        </header>
    )
};