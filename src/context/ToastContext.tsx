import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]); // Keep at most 4 active

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Portal */}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-md w-full px-4"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            let bg = 'bg-colin-navy text-white border-colin-teal/40';
            let Icon = CheckCircle2;
            let iconColor = 'text-emerald-400';

            if (toast.type === 'error') {
              bg = 'bg-rose-950 text-white border-rose-500/40';
              Icon = AlertCircle;
              iconColor = 'text-rose-400';
            } else if (toast.type === 'warning') {
              bg = 'bg-amber-950 text-white border-amber-500/40';
              Icon = AlertTriangle;
              iconColor = 'text-amber-400';
            } else if (toast.type === 'info') {
              bg = 'bg-colin-navy-900 text-white border-colin-teal/40';
              Icon = Info;
              iconColor = 'text-colin-teal-300';
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-xs font-semibold ${bg}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={`shrink-0 ${iconColor}`} />
                  <span className="leading-snug">{toast.message}</span>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      showToast: (msg: string) => {
        if (typeof console !== 'undefined') console.log('[COLIN Toast]:', msg);
      },
    };
  }
  return context;
};
