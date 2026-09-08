import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, AlertTriangle } from 'lucide-react';

interface FloatingMoreMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface FloatingMoreMenuProps {
  items?: FloatingMoreMenuItem[];
  onResetAccess?: () => void;
  disabled?: boolean;
  buttonTitle?: string;
  buttonClassName?: string;
}

export const FloatingMoreMenu: React.FC<FloatingMoreMenuProps> = ({
  items,
  onResetAccess,
  disabled = false,
  buttonTitle = '更多操作',
  buttonClassName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false
  });

  const menuItems: FloatingMoreMenuItem[] = items || (onResetAccess ? [
    {
      id: 'default-reset-access',
      label: '重置接入',
      description: '清空正式查询数据并转为草稿',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[var(--ty-red-color)]" />,
      danger: true,
      disabled: disabled,
      onClick: onResetAccess
    }
  ] : []);

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const itemHeight = 56;
    const menuHeight = Math.max(50, menuItems.length * itemHeight + 10);
    const menuWidth = 192; // w-48 = 192px

    // 如果按钮下方空间不够，则在按钮上方展开
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = placeAbove ? rect.top - menuHeight - 4 : rect.bottom + 4;
    // 右对齐按钮右边缘，但防止超出屏幕左侧
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;

    setCoords({ top, left, placeAbove });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (target.closest('.floating-more-menu-portal')) return;
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={buttonClassName || `h-8 w-8 rounded-ty-sm border border-[var(--ty-border-color)] flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-[var(--ty-fill-weak-dark-color)] text-[var(--ty-font-main-color)]'
            : 'bg-[var(--ty-fill-white-color)] text-[var(--ty-icon-color)] hover:bg-[var(--ty-fill-weak-dark-color)]'
        }`}
        title={buttonTitle}
        aria-label={buttonTitle}
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {isOpen &&
        createPortal(
          <div
            className="floating-more-menu-portal fixed z-50 w-48 bg-[var(--ty-fill-white-color)] border border-[var(--ty-border-color)] rounded-ty-sm shadow-ty-lg py-1 text-ty-xs text-left animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-3 py-2 flex items-center space-x-2 transition-colors ${
                  item.disabled
                    ? 'opacity-50 cursor-not-allowed text-[var(--ty-font-sub-light-color)]'
                    : item.danger
                    ? 'text-[var(--ty-red-color)] hover:bg-[var(--ty-red-lightest-color)] cursor-pointer'
                    : 'text-[var(--ty-font-main-color)] hover:bg-[var(--ty-fill-weak-dark-color)] cursor-pointer'
                }`}
              >
                {item.icon}
                <div className="leading-tight">
                  <div className="font-semibold">{item.label}</div>
                  {item.description && (
                    <div className="text-ty-2xs text-[var(--ty-font-sub-light-color)]">{item.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
