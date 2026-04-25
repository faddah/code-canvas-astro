import type { JSX } from "react";
import { WebPreview } from "@/components/WebPreview";
import { ConsolePanel } from "@/components/ConsolePanel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface ExecutionPanelProps {
    htmlOutput: string | null;
    logs: string[];
    onClear: () => void;
    isWaitingForInput: boolean;
    onSubmitInput: (input: string) => void;
}

export default function ExecutionPanel({
    htmlOutput,
    logs,
    onClear,
    isWaitingForInput,
    onSubmitInput,
}: ExecutionPanelProps): JSX.Element {
    return (
        <>
            <ResizableHandle aria-label="Resize editor and output panels" className="w-1.5 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

            {/* Right Panel Group (Preview + Console) */}
            <ResizablePanel defaultSize={50} minSize={30}>
                <ResizablePanelGroup orientation="vertical">

                    {/* Web Preview */}
                    <ResizablePanel defaultSize={60} minSize={20}>
                        <WebPreview htmlContent={htmlOutput} />
                    </ResizablePanel>

                    <ResizableHandle aria-label="Resize preview and console panels" className="h-0.75! w-full! bg-[#CCCCCC] hover:bg-primary/50 transition-colors cursor-row-resize" />

                    {/* Console */}
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <ConsolePanel
                            logs={logs}
                            onClear={onClear}
                            isWaitingForInput={isWaitingForInput}
                            onSubmitInput={onSubmitInput}
                        />

                    </ResizablePanel>

                </ResizablePanelGroup>
            </ResizablePanel>
        </>
    );
}