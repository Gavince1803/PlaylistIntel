import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlaylistIntel - Music Analytics & Insights",
  description: "Advanced playlist analytics and music insights for Spotify users",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  other: {
    // iOS Safari status bar customization
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'PlaylistIntel',
    // Viewport settings for better mobile experience
    'viewport': 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    // Theme color for browser UI
    'theme-color': '#191414',
    'msapplication-TileColor': '#191414',
    'msapplication-navbutton-color': '#191414',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white text-gray-900 dark:bg-[#191414] dark:text-white">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white text-gray-900 dark:bg-[#191414] dark:text-white transition-colors ios-fullscreen`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <Providers>
              {children}
            </Providers>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
