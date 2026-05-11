'use client';

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClear: () => void;
}

export default function SearchBar({
  query,
  onQueryChange,
  resultCount,
  currentIndex,
  onPrev,
  onNext,
  onClear,
}: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-900/80 border-b border-gray-800 px-3 py-1.5">
      <span className="text-gray-500 text-xs">🔍</span>
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索..."
        className="w-44 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNext();
          if (e.key === 'Escape') onClear();
        }}
      />
      {query && (
        <span className="text-xs text-gray-500 min-w-[48px] text-center">
          {resultCount > 0
            ? `${currentIndex + 1}/${resultCount}`
            : '0/0'}
        </span>
      )}
      {resultCount > 0 && (
        <>
          <button onClick={onPrev} className="text-gray-400 hover:text-white text-xs px-0.5 transition" title="上一个">▲</button>
          <button onClick={onNext} className="text-gray-400 hover:text-white text-xs px-0.5 transition" title="下一个">▼</button>
        </>
      )}
      {query && (
        <button onClick={onClear} className="text-gray-500 hover:text-gray-300 text-xs transition" title="关闭搜索 (Esc)">✕</button>
      )}
    </div>
  );
}