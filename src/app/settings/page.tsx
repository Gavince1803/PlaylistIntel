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
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-4 sm:p-6 lg:p-8">
              <div className="max-w-4xl mx-auto">
          {/* Theme indicator */}
          <div className="mb-4 p-4 bg-[#1DB954]/10 rounded-lg border border-[#1DB954]/20">
            <p className="text-white text-sm">
              Current theme: <span className="font-bold">{theme}</span> | 
              Current language: <span className="font-bold">{language}</span>
            </p>
          </div>
          
          {/* Header */}
          <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#282828] rounded-lg transition-colors"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-gray-300 text-lg">Customize your experience</p>
        </div>

        <div className="space-y-8">
          {/* Account Information */}
          <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Account Information</h2>
            <div className="space-y-6">
              {/* Spotify Account Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Spotify Account</h3>
                <div className="flex items-center space-x-4">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-16 h-16 rounded-full border-2 border-[#1DB954]/30"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold text-lg">{session?.user?.name || 'User Name'}</p>
                    <p className="text-gray-400">{session?.user?.email || 'user@example.com'}</p>
                    <p className="text-[#1DB954] text-sm">
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
                <h3 className="text-lg font-semibold text-white mb-3">Custom Profile Picture</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {customProfilePicture ? (
                      <img
                        src={customProfilePicture}
                        alt="Custom profile"
                        className="w-16 h-16 rounded-full border-2 border-[#1DB954]/30"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center border-2 border-dashed border-gray-500">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                      <span className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        {customProfilePicture ? 'Change Picture' : 'Upload Picture'}
                      </span>
                    </label>
                    {customProfilePicture && (
                      <button
                        onClick={removeCustomProfilePicture}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        Remove Picture
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  This picture will be used in the sidebar. Your Spotify picture will be used in the dashboard.
                </p>
              </div>
            </div>
          </section>



          {/* Preferences */}
          <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Preferences</h2>
            <div className="space-y-6">
              <div>
                <p className="text-white font-medium mb-2">Theme</p>
                <div className="relative">
                  <div className="w-full px-4 py-3 bg-[#404040] text-white rounded-xl border border-[#282828] flex items-center">
                    <span className="text-gray-400">🌙 Dark (Fixed)</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-white font-medium mb-2">Language</p>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLanguage = e.target.value as 'en' | 'es';
                      handlePreferenceChange('language', newLanguage);
                      setLanguage(newLanguage);
                    }}
                    className="w-full px-4 py-3 bg-[#404040] text-white rounded-xl border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954] appearance-none cursor-pointer transition-all duration-200 hover:border-[#1DB954]/50"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto-save Profiles</p>
                  <p className="text-gray-400 text-sm">Automatically save analyzed playlist profiles</p>
                </div>
                <button
                  onClick={() => handlePreferenceChange('autoSaveProfiles')}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    settings.preferences.autoSaveProfiles ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.preferences.autoSaveProfiles ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1DB954] text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 