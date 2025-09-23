import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md sm:rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-5 sm:m-0 m-0 rounded-t-2xl">
        {title && <h3 className="text-base font-semibold text-slate-100 mb-3">{title}</h3>}
        <div>{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  );
}
