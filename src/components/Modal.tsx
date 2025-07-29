'use client';
import { ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 lg:p-8 backdrop-enter"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={onClose}
    >
      <div
        className="bg-[#232323] rounded-2xl shadow-2xl border border-[#282828] p-2 sm:p-4 max-w-full sm:max-w-4xl lg:max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] relative focus:outline-none overflow-hidden"
        ref={dialogRef}
        tabIndex={0}
        onClick={e => e.stopPropagation()}
        style={{
          animation: 'modalEnter 0.3s ease-out forwards'
        }}
      >

        {title && <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">{title}</h2>}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] modal-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
} 