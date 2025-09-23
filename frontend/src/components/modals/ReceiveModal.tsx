import React, { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

interface ReceiveModalProps {
  open: boolean;
  onClose: () => void;
  address?: string;
}

export default function ReceiveModal({ open, onClose, address }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!address) return;
    let ok = false;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(address);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const el = document.createElement("textarea");
        el.value = address;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        ok = true;
      } catch {}
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Receive">
      <div className="text-sm text-slate-300">
        <p className="mb-2">Share your address to receive USDC.</p>
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3">
          <div className="text-[10px] uppercase text-slate-500">Your address</div>
          <div className="mt-1 font-mono text-xs text-slate-100 break-all select-all">{address || "Not connected"}</div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Make sure the sender is on the same network.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button
          variant="primary"
          onClick={copy}
          disabled={!address}
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy address"}
        </Button>
      </div>
    </Modal>
  );
}
