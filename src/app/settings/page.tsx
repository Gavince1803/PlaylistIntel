'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useToast } from '@/components/Toast';

interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    recommendations: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showListeningHistory: boolean;
    allowAnalytics: boolean;
  };
  preferences: {
    theme: 'dark' | 'light' | 'auto';
    language: 'en' | 'es';
    autoSaveProfiles: boolean;
  };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  
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
    notifications: {
      email: true,
      push: false,
      recommendations: true,
    },
    privacy: {
      profileVisibility: 'public',
      showListeningHistory: true,
      allowAnalytics: true,
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      autoSaveProfiles: true,
    },
  });

  const handleNotificationChange = (key: keyof Settings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handlePrivacyChange = (key: keyof Settings['privacy'], value?: any) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value !== undefined ? value : !prev.privacy[key],
      },
    }));
  };

  const handlePreferenceChange = (key: keyof Settings['preferences'], value?: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value !== undefined ? value : !prev.preferences[key],
      },
    }));
  };

  const saveSettings = async () => {
    try {
      // TODO: Implement actual settings save API call
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#232323] to-[#1DB954] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
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
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-16 h-16 rounded-full"
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
          </section>

          {/* Notifications */}
          <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-gray-400 text-sm">Receive updates via email</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('email')}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    settings.notifications.email ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.notifications.email ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-gray-400 text-sm">Receive push notifications</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('push')}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    settings.notifications.push ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.notifications.push ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Music Recommendations</p>
                  <p className="text-gray-400 text-sm">Get personalized music suggestions</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('recommendations')}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    settings.notifications.recommendations ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.notifications.recommendations ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-gradient-to-br from-[#232323] to-[#2a2a2a] rounded-2xl p-6 border border-[#282828] shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Privacy</h2>
            <div className="space-y-6">
              <div>
                <p className="text-white font-medium mb-2">Profile Visibility</p>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                  className="w-full px-4 py-2 bg-[#404040] text-white rounded-lg border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954]"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Show Listening History</p>
                  <p className="text-gray-400 text-sm">Allow others to see your listening activity</p>
                </div>
                <button
                  onClick={() => handlePrivacyChange('showListeningHistory')}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    settings.privacy.showListeningHistory ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.privacy.showListeningHistory ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Analytics & Insights</p>
                  <p className="text-gray-400 text-sm">Help improve the app with anonymous data</p>
                </div>
                <button
                  onClick={() => handlePrivacyChange('allowAnalytics')}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    settings.privacy.allowAnalytics ? 'bg-[#1DB954] shadow-lg shadow-[#1DB954]/30' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    settings.privacy.allowAnalytics ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
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
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className="w-full px-4 py-3 bg-[#404040] text-white rounded-xl border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954] appearance-none cursor-pointer transition-all duration-200 hover:border-[#1DB954]/50"
                  >
                    <option value="dark">🌙 Dark</option>
                    <option value="light">☀️ Light</option>
                    <option value="auto">🔄 Auto</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-white font-medium mb-2">Language</p>
                <div className="relative">
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
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