'use client';

interface Props {
  title: string;
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export default function MobileHeader({ title, onMenuClick, onSearchClick }: Props) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950 shrink-0">
      <button onClick={onMenuClick} className="text-gray-300 text-lg px-1">
        ☰
      </button>
      <span className="text-sm font-semibold text-gray-200 truncate mx-2">{title}</span>
      <button onClick={onSearchClick} className="text-gray-300 text-lg px-1">
        🔍
      </button>
    </header>
  );
}