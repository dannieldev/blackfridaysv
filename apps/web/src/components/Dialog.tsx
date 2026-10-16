import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  className?: string;
}

export function Dialog({ children, onClose, labelledBy, className = '' }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const focusTarget = previousFocus instanceof HTMLElement && previousFocus.isConnected
        ? previousFocus
        : document.getElementById('catalog-title') ?? document.querySelector<HTMLInputElement>('input[type="search"]');
      focusTarget?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal-backdrop"
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPointerDown.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPointerDown.current && event.target === event.currentTarget) onClose();
        backdropPointerDown.current = false;
      }}
    >
      <div className={`modal-shell ${className}`.trim()}>{children}</div>
    </dialog>
  );
}
