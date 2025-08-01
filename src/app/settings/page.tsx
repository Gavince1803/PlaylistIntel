'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { useTheme, useLanguage } from '@/components/Providers';

interface Settings {
  preferences: {
    theme: 'dark' | 'light' | 'auto';
    language: 'en' | 'es';
    autoSaveProfiles: boolean;
  };
  customProfilePicture?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  
  // Extend user type to include product
  type UserWithProduct = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id?: string;
    product?: string;
  };
  const user = session?.user as UserWithProduct | undefined;
  
  const [settings, setSettings] = useState<Settings>({
    preferences: {
      theme: 'dark',
      language: 'en',
      autoSaveProfiles: true,
    },
  });
  const [customProfilePicture, setCustomProfilePicture] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    
    // Load custom profile picture
    const savedCustomPicture = localStorage.getItem('customProfilePicture');
    if (savedCustomPicture) {
      setCustomProfilePicture(savedCustomPicture);
    }
  }, []);

  // Sync settings with theme and language contexts
  useEffect(() => {
    if (settings.preferences.theme !== theme) {
      setTheme(settings.preferences.theme as 'light' | 'dark');
    }
    if (settings.preferences.language !== language) {
      setLanguage(settings.preferences.language as 'en' | 'es');
    }
  }, [settings.preferences.theme, settings.preferences.language, theme, language, setTheme, setLanguage]);

  const handlePreferenceChange = (key: keyof Settings['preferences'], value?: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value !== undefined ? value : !prev.preferences[key],
      },
    }));
  };

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomProfilePicture(result);
        localStorage.setItem('customProfilePicture', result);
        showToast('Profile picture updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCustomProfilePicture = () => {
    setCustomProfilePicture(null);
    localStorage.removeItem('customProfilePicture');
    showToast('Profile picture removed!', 'success');
  };

  const saveSettings = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Update autoSaveProfiles setting in localStorage
      localStorage.setItem('autoSaveProfiles', settings.preferences.autoSaveProfiles.toString());
      
      // Update theme and language in contexts
      setTheme(settings.preferences.theme as 'light' | 'dark');
      setLanguage(settings.preferences.language as 'en' | 'es');
      
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    }
  };

  return (
    <div className="flex h-screen font-sans bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954]">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-[#282828] p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 text-sm">Customize your experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* Theme indicator */}
            <div className="mb-4 p-3 lg:p-4 bg-[#1DB954]/10 rounded-lg border border-[#1DB954]/20">
              <p className="text-white text-xs lg:text-sm">
                Current theme: <span className="font-bold">{theme}</span> | 
                Current language: <span className="font-bold">{language}</span>
              </p>
            </div>

            <section className="bg-[#232323] rounded-2xl lg:rounded-3xl shadow-2xl border border-[#282828] overflow-hidden">
              <div className="p-4 lg:p-8 border-b border-[#282828] bg-gradient-to-r from-[#232323] to-[#2a2a2a]">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#1DB954] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-3xl font-bold text-white">Settings</h2>
                    <p className="text-gray-400 text-sm lg:text-base mt-1">Customize your experience</p>
                  </div>
                </div>
              </div>
              <div className="p-4 lg:p-8">
                <div className="space-y-6 lg:space-y-8">
                  {/* Account Information */}
                  <div className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">Account Information</h2>
            <div className="space-y-4 lg:space-y-6">
              {/* Spotify Account Info */}
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-white mb-3">Spotify Account</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 border-[#1DB954]/30 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#1DB954] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-lg lg:text-2xl font-bold text-white">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-base lg:text-lg truncate">{session?.user?.name || 'User Name'}</p>
                    <p className="text-gray-400 text-sm lg:text-base truncate">{session?.user?.email || 'user@example.com'}</p>
                    <p className="text-[#1DB954] text-xs lg:text-sm">
                      {user?.product ? 
                        user.product.charAt(0).toUpperCase() + user.product.slice(1) : 
                        'Account'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Profile Picture */}
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-white mb-3">Custom Profile Picture</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4">
                  <div className="relative flex-shrink-0">
                    {customProfilePicture ? (
                      <img
                        src={customProfilePicture}
                        alt="Custom profile"
                        className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 border-[#1DB954]/30"
                      />
                    ) : (
                      <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-600 rounded-full flex items-center justify-center border-2 border-dashed border-gray-500">
                        <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 min-w-0 flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                      <span className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block">
                        {customProfilePicture ? 'Change Picture' : 'Upload Picture'}
                      </span>
                    </label>
                    {customProfilePicture && (
                      <button
                        onClick={removeCustomProfilePicture}
                        className="text-red-400 hover:text-red-300 text-xs lg:text-sm font-medium transition-colors"
                      >
                        Remove Picture
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-xs lg:text-sm mt-2">
                  This picture will be used in the sidebar. Your Spotify picture will be used in the dashboard.
                </p>
              </div>
            </div>
          </section>



          {/* Preferences */}
          <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-[#282828] shadow-xl">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6">Preferences</h2>
            <div className="space-y-4 lg:space-y-6">
              <div>
                <p className="text-white font-medium mb-2 text-sm lg:text-base">Theme</p>
                <div className="relative">
                  <div className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-[#404040] text-white rounded-lg lg:rounded-xl border border-[#282828] flex items-center">
                    <span className="text-gray-400 text-sm lg:text-base">🌙 Dark (Fixed)</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-white font-medium mb-2 text-sm lg:text-base">Language</p>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLanguage = e.target.value as 'en' | 'es';
                      handlePreferenceChange('language', newLanguage);
                      setLanguage(newLanguage);
                    }}
                    className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-[#404040] text-white rounded-lg lg:rounded-xl border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954] appearance-none cursor-pointer transition-all duration-200 hover:border-[#1DB954]/50 text-sm lg:text-base"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm lg:text-base">Auto-save Profiles</p>
                  <p className="text-gray-400 text-xs lg:text-sm">Automatically save analyzed playlist profiles</p>
                </div>
                <button
                  onClick={() => handlePreferenceChange('autoSaveProfiles')}
                  className={`relative w-12 h-6 lg:w-14 lg:h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                    settings.preferences.autoSaveProfiles ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 lg:w-6 lg:h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.preferences.autoSaveProfiles ? 'translate-x-6 lg:translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-lg lg:rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm lg:text-base"
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </button>
          </div>
            </div>
          </section>
        </div>
        </main>
      </div>
    </div>
  );
} 