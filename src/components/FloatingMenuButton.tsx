'use client';

interface FloatingMenuButtonProps {
  onMenuClick: () => void;
}

export default function FloatingMenuButton({ onMenuClick }: FloatingMenuButtonProps) {
  return (
    <button
      onClick={onMenuClick}
      className="
        fixed top-6 left-6 z-50 lg:hidden
        p-4 rounded-full bg-[#1DB954] hover:bg-[#1ed760] 
        text-white shadow-xl transition-all duration-300 ease-in-out
        transform hover:scale-110 active:scale-95
        opacity-100
        border-2 border-white/20
      "
      aria-label="Open sidebar menu"
      style={{
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(29, 185, 84, 0.95)',
        boxShadow: '0 10px 25px rgba(29, 185, 84, 0.3)'
      }}
    >
      <svg 
        className="w-7 h-7" 
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