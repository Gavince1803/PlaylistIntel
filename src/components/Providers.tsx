'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// Theme context and provider
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
const ThemeContext = createContext<ThemeContextType>({ 
  theme: 'dark', 
  toggleTheme: () => {}, 
  setTheme: () => {} 
});

// Language context and provider
interface LanguageContextType {
  language: 'en' | 'es';
  setLanguage: (language: 'en' | 'es') => void;
}
const LanguageContext = createContext<LanguageContextType>({ 
  language: 'en', 
  setLanguage: () => {} 
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function useLanguage() {
  return useContext(LanguageContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = (typeof window !== 'undefined' && localStorage.getItem('theme')) as 'light' | 'dark' | null;
    setThemeState(storedTheme || 'dark');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Remove both classes first
    document.documentElement.classList.remove('light', 'dark');
    // Add the current theme class
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  const setTheme = (newTheme: 'light' | 'dark') => setThemeState(newTheme);

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<'en' | 'es'>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedLanguage = (typeof window !== 'undefined' && localStorage.getItem('language')) as 'en' | 'es' | null;
    setLanguageState(storedLanguage || 'en');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('language', language);
  }, [language, mounted]);

  const setLanguage = (newLanguage: 'en' | 'es') => setLanguageState(newLanguage);

  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 