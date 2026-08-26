import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface CopyableFieldProps {
  value: string;
  icon: ReactNode;
  label?: string;
}

/**
 * Contact detail that copies to the clipboard instead of opening a `tel:` or
 * `mailto:` handler. Browsers prompt for an external application on those
 * schemes, which interrupts the agent mid-flow.
 */
export const CopyableField = ({ value, icon, label }: CopyableFieldProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be denied (insecure origin, permissions). Fall back
      // to selecting nothing rather than throwing at the user.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); void copy(); }}
      className="group flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={copied ? "Copiado" : `Copiar ${label ?? "dato"}`}
      aria-label={copied ? "Copiado" : `Copiar ${label ?? value}`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{value}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
        : <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />}
    </button>
  );
};
