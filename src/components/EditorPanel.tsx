import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { Code2, X } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { ResizablePanel } from "./ui/resizable";

interface FileTabProps {
    name: string;
    isActive: boolean;
    isUnsaved: boolean;
    onClick: () => void;
    onClose: (e: React.MouseEvent) => void;
}

// TODO: consolidate with src/components/FileTab.tsx in a follow-up PR.
// Both implement the same tab semantics; EditorPanel keeps its own copy
// because the callback signatures and styling differ slightly.
function FileTab({ name, isActive, isUnsaved, onClick, onClose }: FileTabProps): JSX.Element {
    return (
        <div
            data-testid="file-tab"
            data-active={isActive ? "true" : undefined}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onKeyDown={(e) => { 
                    if (e.key === "Enter" || e.key === " ") { 
                        e.preventDefault();
                        onClick(); 
                    } 
                }
            }
            className={`flex items-center px-3 py-1 cursor-pointer border-r border-border hover:bg-muted/50 ${
                isActive ? 'bg-background border-b-2 border-primary' : ''
            }`}
            onClick={onClick}
        >
            <span className={`text-sm ${isUnsaved ? 'font-semibold' : ''}`}>{name}</span>
            {isUnsaved && (
                <>
                    <span aria-hidden="true" className="ml-1 text-xs text-orange-500">•</span>
                    <span className="sr-only">unsaved changes</span>
                </>
            )}
            <Button
                aria-label={`Close ${name}`}
                variant="ghost"
                size="sm"
                className="ml-2 h-4 w-4 p-0 hover:bg-destructive/20"
                onClick={onClose}
            >
                <X aria-hidden="true" className="h-3 w-3" />
            </Button>
        </div>
    );
}

interface EditorPanelProps {
    files: any[];
    activeFileId: number | null;
    activeFile: any;
    openFileIds: number[];
    unsavedChanges: Record<number, string>;
    isSignedIn: boolean;
    onTabClick: (id: number) => void;
    onTabClose: (e: React.MouseEvent, id: number) => void;
    onEditorChange: (value: string | undefined) => void;
    onQuickSave: () => void;
}

export default function EditorPanel({
    files,
    activeFileId,
    activeFile,
    openFileIds,
    unsavedChanges,
    isSignedIn,
    onTabClick,
    onTabClose,
    onEditorChange,
    onQuickSave,
}: EditorPanelProps): JSX.Element {
    const activeContent: string = activeFileId
        ? (unsavedChanges[activeFileId] ?? activeFile?.content ?? "")
        : "";

    /* Editor Panel */
    return (
        <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
                <span data-testid="editor-state-content" style={{ display: 'none' }}>
                    {activeContent}
                </span>
                {/* Tabs Bar */}
                <div role="tablist" aria-label="Open files" className="h-9 flex bg-muted/30 border-b border-border overflow-x-auto no-scrollbar">
                    {openFileIds.map(id => {
                        const file = files?.find((f: any) => f.id === id);
                        if (!file) return null;
                        return (
                            <FileTab
                                key={id}
                                name={file.name}
                                isActive={activeFileId === id}
                                isUnsaved={!!unsavedChanges[id]}
                                onClick={() => activeFileId !== id && onTabClick(id)}
                                onClose={(e) => onTabClose(e, id)}
                            />
                        );
                    })}

                    {openFileIds.length === 0 && (
                        <div className="flex items-center px-4 text-xs text-muted-foreground italic">
                            No files open
                        </div>
                    )}
                </div>

                {/* Monaco Editor */}
                <div role="tabpanel" aria-label={activeFile?.name ?? "Editor"} className="flex-1 relative bg-[#1e1e1e]">
                    {activeFileId ? (
                        <div style={{ height: '100%' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="python"
                            theme="vs-dark"
                            path={`file://${activeFileId}`}
                            value={unsavedChanges[activeFileId] ?? activeFile?.content}
                            onChange={onEditorChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', monospace",
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 4,
                                padding: { top: 16 },
                                readOnly: false,
                            }}
                            onMount={(editor) => {
                                if (isSignedIn) {
                                    editor.addCommand(2048 | 49, () => {
                                        onQuickSave();
                                    });
                                }
                            }}
                        />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30">
                        <Code2 aria-hidden="true" className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a file to edit</p>
                        </div>
                    )}
                </div>
            </div>
        </ResizablePanel>
    )
};
