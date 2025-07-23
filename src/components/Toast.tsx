'use client';
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed z-50 space-y-2 top-2 right-2 left-2 sm:top-6 sm:right-6 sm:left-auto max-w-xs w-full mx-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-3 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg text-white font-semibold text-sm sm:text-base transition-all animate-fade-in-down
                ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}
              role="alert"
              aria-live="assertive"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// Add animation
// In globals.css:
// @keyframes fade-in-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fade-in-down { animation: fade-in-down 0.4s cubic-bezier(0.4,0,0.2,1) both; } 