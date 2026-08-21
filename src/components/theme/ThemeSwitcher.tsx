import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  {
    value: "dark",
    label: "Obsidiana",
    description: "Oscuro, alto contraste",
    icon: Moon,
  },
  {
    value: "light",
    label: "Marfil",
    description: "Claro, lectura prolongada",
    icon: Sun,
  },
  {
    value: "system",
    label: "Automático",
    description: "Sigue tu dispositivo",
    icon: Laptop,
  },
] as const;

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Cambiar tema visual"
          title="Cambiar tema visual"
          className="app-icon-button"
        >
          <Palette className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Tema visual</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((option) => {
          const Icon = option.icon;
          const selected = mounted && theme === option.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setTheme(option.value)}
              className="min-h-12 gap-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
              {selected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
