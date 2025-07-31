'use client';

import { useState, useEffect } from 'react';

export default function UserAvatar() {
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }
  }, []);

  if (!userAvatar) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="relative group">
        <img
          src={userAvatar}
          alt="Your profile picture"
          className="w-16 h-16 rounded-full object-cover border-2 border-[#1DB954] shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer"
        />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#1DB954] rounded-full border-2 border-[#191414] flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
  );
} 