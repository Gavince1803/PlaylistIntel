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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifications.email ? 'bg-[#1DB954]' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifications.email ? 'translate-x-6' : 'translate-x-0'
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifications.push ? 'bg-[#1DB954]' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifications.push ? 'translate-x-6' : 'translate-x-0'
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.notifications.recommendations ? 'bg-[#1DB954]' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.notifications.recommendations ? 'translate-x-6' : 'translate-x-0'
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.privacy.showListeningHistory ? 'bg-[#1DB954]' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.privacy.showListeningHistory ? 'translate-x-6' : 'translate-x-0'
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.privacy.allowAnalytics ? 'bg-[#1DB954]' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.privacy.allowAnalytics ? 'translate-x-6' : 'translate-x-0'
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
                <select
                  value={settings.preferences.theme}
                  onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                  className="w-full px-4 py-2 bg-[#404040] text-white rounded-lg border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954]"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <p className="text-white font-medium mb-2">Language</p>
                <select
                  value={settings.preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="w-full px-4 py-2 bg-[#404040] text-white rounded-lg border border-[#282828] focus:ring-2 focus:ring-[#1DB954] focus:border-[#1DB954]"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto-save Profiles</p>
                  <p className="text-gray-400 text-sm">Automatically save analyzed playlist profiles</p>
                </div>
                <button
                  onClick={() => handlePreferenceChange('autoSaveProfiles')}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.preferences.autoSaveProfiles ? 'bg-[#1DB954]' : 'bg-[#404040]'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.preferences.autoSaveProfiles ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 