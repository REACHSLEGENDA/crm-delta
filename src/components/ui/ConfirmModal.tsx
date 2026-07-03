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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D1428] border border-[rgba(212,175,55,0.2)] rounded-xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onCancel}
          className="absolute right-4 top-4 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-3 rounded-full ${isDestructive ? 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]' : 'bg-[rgba(212,175,55,0.1)] text-[#D4AF37]'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          
          <div>
            <h3 className="text-lg font-title font-bold text-[#F8FAFC]">{title}</h3>
            <p className="text-sm text-[#94A3B8] mt-2">{message}</p>
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded text-xs font-semibold bg-[#111A33] border border-[rgba(255,255,255,0.1)] text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onConfirm(); onCancel(); }}
              className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${
                isDestructive 
                  ? "bg-[#EF4444] hover:bg-[#DC2626] text-white" 
                  : "gold-button-primary"
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
