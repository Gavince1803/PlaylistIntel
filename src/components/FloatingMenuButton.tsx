'use client';

interface FloatingMenuButtonProps {
  onMenuClick: () => void;
}

export default function FloatingMenuButton({ onMenuClick }: FloatingMenuButtonProps) {
  return (
    <button
      onClick={onMenuClick}
      className="
        fixed top-4 left-4 z-40 lg:hidden
        p-3 rounded-full bg-[#1DB954] hover:bg-[#1ed760] 
        text-white shadow-lg transition-all duration-200 ease-in-out
        transform hover:scale-105 active:scale-95
        opacity-90 hover:opacity-100
        border border-white/10
      "
      aria-label="Open sidebar menu"
      style={{
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(29, 185, 84, 0.85)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 6h16M4 12h16M4 18h16" 
        />
      </svg>
    </button>
  );
} 