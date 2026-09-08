import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** 原生模态层负责焦点约束和背景隔离，内容区独立滚动。 */
export function ConsistencyPlanDialog({
  title,
  onDismiss,
  children,
}: {
  title: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('[data-autofocus]')?.focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="plan-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <header className="plan-dialog-heading">
        <h2>{title}</h2>
        <button type="button" aria-label="关闭方案弹窗" onClick={onDismiss}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
