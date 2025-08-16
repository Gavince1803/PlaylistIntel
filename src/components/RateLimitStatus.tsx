'use client';

import { useState, useEffect } from 'react';

interface RateLimitStatusProps {
  className?: string;
}

export default function RateLimitStatus({ className = '' }: RateLimitStatusProps) {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Listen for rate limit errors from the app
    const handleRateLimitError = (event: CustomEvent) => {
      if (event.detail?.statusCode === 429) {
        setIsRateLimited(true);
        setLastError('Rate limit exceeded');
        setErrorCount(prev => prev + 1);
        
        // Reset after 5 minutes
        setTimeout(() => {
          setIsRateLimited(false);
          setLastError(null);
        }, 5 * 60 * 1000);
      }
    };

    const handleForbiddenError = (event: CustomEvent) => {
      if (event.detail?.statusCode === 403) {
        setLastError('Development mode restriction');
        setErrorCount(prev => prev + 1);
      }
    };

    const handleAuthError = (event: CustomEvent) => {
      if (event.detail?.statusCode === 401) {
        setLastError('Authentication failed');
        setErrorCount(prev => prev + 1);
      }
    };

    // Add event listeners
    window.addEventListener('rate-limit-error', handleRateLimitError as EventListener);
    window.addEventListener('forbidden-error', handleForbiddenError as EventListener);
    window.addEventListener('auth-error', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('rate-limit-error', handleRateLimitError as EventListener);
      window.removeEventListener('forbidden-error', handleForbiddenError as EventListener);
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, []);

  if (!isRateLimited && !lastError) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          {isRateLimited ? (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-400 mb-1">
            {isRateLimited ? 'Rate Limiting Active' : 'API Status'}
          </h4>
          
          {isRateLimited && (
            <p className="text-xs text-amber-300/80 mb-2">
              Spotify API rate limit exceeded. The app is automatically managing requests with delays.
            </p>
          )}
          
          {lastError && (
            <p className="text-xs text-amber-300/80 mb-2">
              Last error: {lastError} (occurred {errorCount} time{errorCount !== 1 ? 's' : ''})
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
              ⏰ Auto-retry enabled
            </div>
            <div className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
              🔄 Smart delays
            </div>
            <div className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
              💾 Using cached data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
