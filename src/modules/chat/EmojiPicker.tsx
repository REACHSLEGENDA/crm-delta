import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import { Picker } from "emoji-mart";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

/**
 * Mounts the framework-agnostic emoji-mart Picker via a ref. We use the core
 * package (not @emoji-mart/react) because its React wrapper doesn't declare
 * React 19 as a supported peer. Theme follows the app's light/dark class.
 */
export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const picker = new Picker({
      data,
      theme,
      perLine: 8,
      previewPosition: "none",
      skinTonePosition: "search",
      navPosition: "top",
      maxFrequentRows: 2,
      onEmojiSelect: (emoji: { native?: string }) => {
        if (emoji.native) selectRef.current(emoji.native);
      },
    });
    const host = hostRef.current;
    const node = picker as unknown as HTMLElement;
    host?.appendChild(node);
    return () => {
      if (host?.contains(node)) host.removeChild(node);
    };
  }, []);

  return <div ref={hostRef} />;
}
