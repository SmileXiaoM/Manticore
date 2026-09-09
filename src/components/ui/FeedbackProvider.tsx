import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type FeedbackTone = 'success' | 'warning' | 'info';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger';
}

interface FeedbackApi {
  notify: (message: string, tone?: FeedbackTone) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const toastTone: Record<FeedbackTone, string> = {
  success: 'border-[var(--ty-green-color)]/30 bg-[var(--ty-green-lightest-color)]',
  warning: 'border-[var(--ty-orange-color)]/30 bg-[var(--ty-orange-lightest-color)]',
  info: 'border-[var(--ty-primary-color)]/30 bg-[var(--ty-primary-lightest-color)]',
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, tone: FeedbackTone = 'info') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string) => (
    new Promise<boolean>((resolve) => {
      const normalized = typeof options === 'string' ? { message: options } : options;
      setConfirmState({
        title: normalized.title || '操作确认',
        confirmText: normalized.confirmText || '确认',
        cancelText: normalized.cancelText || '取消',
        tone: normalized.tone || 'primary',
        ...normalized,
        resolve,
      });
    })
  ), []);

  const settleConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}

      {toast && (
        <div className="fixed top-[60px] left-1/2 z-[80] w-[min(800px,calc(100vw-32px))] -translate-x-1/2" role="status" aria-live="polite">
          <div className={`min-h-10 rounded-ty-sm border px-4 py-2 text-ty-sm shadow-ty-md flex items-center gap-2 ${toastTone[toast.tone]}`}>
            {toast.tone === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ty-green-color)]" /> : toast.tone === 'warning' ? <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--ty-orange-color)]" /> : <Info className="h-4 w-4 shrink-0 text-[var(--ty-primary-color)]" />}
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button type="button" aria-label="关闭提示" onClick={() => setToast(null)} className="h-7 w-7 rounded-ty-sm text-[var(--ty-icon-color)] hover:bg-[var(--ty-fill-weak-dark-color)] flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[90] bg-ty-overlay flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) settleConfirm(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="global-confirm-title" className="w-[min(480px,calc(100vw-32px))] rounded-ty-lg border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] shadow-ty-lg overflow-hidden">
            <header className="px-4 py-3 border-b border-[var(--ty-border-light-color)] flex items-center justify-between gap-4">
              <h2 id="global-confirm-title" className="text-ty-lg font-semibold">{confirmState.title}</h2>
              <button type="button" aria-label="关闭确认弹窗" onClick={() => settleConfirm(false)} className="h-7 w-7 rounded-ty-sm text-[var(--ty-icon-color)] hover:bg-[var(--ty-fill-color)] flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="px-4 py-5 text-ty-sm text-[var(--ty-font-main-light-color)] leading-6">{confirmState.message}</div>
            <footer className="px-4 py-3 border-t border-[var(--ty-border-light-color)] flex justify-end gap-2">
              <button type="button" onClick={() => settleConfirm(false)} className="h-8 min-w-[68px] px-3 rounded-ty-sm border border-[var(--ty-border-color)] bg-[var(--ty-fill-white-color)] text-ty-xs hover:bg-[var(--ty-fill-color)]">{confirmState.cancelText}</button>
              <button type="button" onClick={() => settleConfirm(true)} className={`h-8 min-w-[68px] px-3 rounded-ty-sm text-ty-xs text-[var(--ty-font-white-color)] ${confirmState.tone === 'danger' ? 'bg-[var(--ty-danger-color)]' : 'bg-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-hover-color)]'}`}>{confirmState.confirmText}</button>
            </footer>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider');
  return context;
}
