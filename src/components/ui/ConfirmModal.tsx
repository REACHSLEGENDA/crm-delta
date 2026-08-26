import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = true }: ConfirmModalProps) => {
  if (!isOpen) return null;

  // Rendered through a portal on <body>. Radix sheets and dialogs mount their
  // own portal and set `pointer-events: none` on the page while open, so a modal
  // living inside the page tree stays visible but stops receiving clicks.
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{ pointerEvents: "auto" }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-sm animate-in rounded-xl border border-border bg-popover p-6 shadow-2xl duration-200 fade-in zoom-in-95">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`rounded-full p-3 ${isDestructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div>
            <h3 className="font-title text-lg font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>

          <div className="mt-4 flex w-full gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); onConfirm(); onCancel(); }}
              className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-colors ${
                isDestructive
                  ? "bg-destructive text-white hover:brightness-110"
                  : "gold-button-primary"
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
