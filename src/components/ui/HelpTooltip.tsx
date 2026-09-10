import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';

interface HelpTooltipProps {
  content: ReactNode;
  label?: string;
  className?: string;
}

export function HelpTooltip({ content, label = '查看说明', className = '' }: HelpTooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placeBelow: false });

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const tooltipWidth = Math.min(288, window.innerWidth - 24);
    const left = Math.min(
      window.innerWidth - tooltipWidth - 12,
      Math.max(12, rect.left + rect.width / 2 - tooltipWidth / 2),
    );
    setPosition({
      top: rect.top < 104 ? rect.bottom + 8 : rect.top - 8,
      left,
      placeBelow: rect.top < 104,
    });
  };

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && triggerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const reposition = () => updatePosition();
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  return (
    <span className={`inline-flex align-middle ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={() => {
          if (document.activeElement !== triggerRef.current) setOpen(false);
        }}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.stopPropagation();
          if (open) setOpen(false);
          else show();
        }}
        className="w-6 h-6 inline-flex items-center justify-center rounded-ty-xs text-[var(--ty-icon-light-color)] hover:text-[var(--ty-primary-color)] hover:bg-[var(--ty-primary-lightest-color)] focus-visible:outline-2 focus-visible:outline-[var(--ty-primary-color)] cursor-help"
      >
        <CircleHelp className="w-3.5 h-3.5" />
      </button>
      {open && createPortal(
        <span
          id={id}
          role="tooltip"
          className="fixed z-[80] w-[min(288px,calc(100vw-24px))] rounded-ty-sm bg-[var(--ty-font-main-color)] px-3 py-2 text-ty-xs leading-5 text-[var(--ty-font-white-color)] shadow-ty-lg"
          style={{
            top: position.top,
            left: position.left,
            transform: position.placeBelow ? undefined : 'translateY(-100%)',
          }}
        >
          <span
            aria-hidden="true"
            className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[var(--ty-font-main-color)] ${position.placeBelow ? '-top-1' : '-bottom-1'}`}
          />
          {content}
        </span>,
        document.body,
      )}
    </span>
  );
}
