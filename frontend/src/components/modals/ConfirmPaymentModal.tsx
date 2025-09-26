import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { SendDetails } from "./SendPaymentModal";

interface ConfirmPaymentModalProps {
  open: boolean;
  onClose: () => void;
  details: SendDetails | null;
  onConfirm: () => void;
  loading?: boolean;
  toAddress?: string;
}

export default function ConfirmPaymentModal({ open, onClose, details, onConfirm, loading, toAddress }: ConfirmPaymentModalProps) {
  if (!details) return null;
  return (
    <Modal open={open} onClose={onClose} title="Confirm Payment">
      <div className="text-sm text-slate-300">
        <p>
          Send <span className="font-semibold text-slate-100">{details.amount} {details.token}</span> to <span className="font-semibold text-slate-100">{details.username}</span>?
        </p>
        {toAddress && (
          <div className="mt-2 rounded-lg bg-slate-900/50 border border-slate-800 p-2 font-mono text-[11px] text-slate-400 break-all">
            {toAddress}
          </div>
        )}
        <p className="mt-2 inline-flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 px-2 py-1 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Gasless – no ETH required
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onConfirm} disabled={loading}>
          {loading ? "Sending..." : "Confirm"}
        </Button>
      </div>
    </Modal>
  );
}
