'use client';

interface Props {
  isAnalyzing: boolean;
  result?: string;
}

export default function PictureAnalysis({ isAnalyzing, result }: Props) {
  if (!isAnalyzing && !result) return null;

  return (
    <div className="flex justify-start">
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-4 py-2 text-sm max-w-[80%]">
        {isAnalyzing && !result && (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="animate-pulse">🔍</span>
            <span className="italic">正在分析截图...</span>
          </div>
        )}
        {result && (
          <div className="text-gray-300 whitespace-pre-wrap">
            <span className="text-xs text-gray-500 block mb-1">📷 截图分析结果：</span>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}