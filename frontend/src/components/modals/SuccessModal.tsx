import React from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  onShare?: () => void;
  message?: string;
}

export default function SuccessModal({ open, onClose, onShare, message = "Payment sent!" }: SuccessModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-3xl text-emerald-300 mb-3">✓</div>
        <h3 className="text-lg font-semibold text-slate-100">Transfer success!!</h3>
        <p className="text-sm text-slate-400 mt-1">{message}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {onShare && (
            <Button variant="secondary" onClick={onShare}>Share as cast</Button>
          )}
          <Button variant="primary" onClick={onClose}>Continue</Button>
        </div>
      </div>
    </Modal>
  );
}
