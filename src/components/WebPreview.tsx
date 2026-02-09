import { Globe, RefreshCw } from "lucide-react";

interface WebPreviewProps {
  htmlContent: string | null;
}

export function WebPreview({ htmlContent }: WebPreviewProps) {
  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden relative">
      <div className="h-10 px-4 flex items-center justify-between border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 select-none">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          <span>Web Preview</span>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative overflow-auto">
        {htmlContent ? (
          <div 
            className="p-8 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="text-center space-y-2 p-6">
              <p className="text-sm font-medium">No Output to Render</p>
              <p className="text-xs text-gray-400 max-w-[200px]">
                Call <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-700">render("&lt;h1&gt;Hi&lt;/h1&gt;")</code> in your Python code to see HTML here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
