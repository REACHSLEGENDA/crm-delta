import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellRing, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { supabase } from "@/lib/supabase";
import type { Notification as CRMNotification } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SOUND_KEY = "delta-capital-notification-sound";

const playNotificationTone = () => {
  try {
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Browser audio is a progressive enhancement; the notification still appears.
  }
};

export const NotificationCenter = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<CRMNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(SOUND_KEY) !== "off",
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as CRMNotification[]);
  }, [profile?.id]);

  useEffect(() => {
    void fetchNotifications();
    if (!profile?.id) return;

    const channel = supabase
      .channel(`notifications_${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const notification = payload.new as CRMNotification;
          setNotifications((current) => [notification, ...current].slice(0, 20));
          if (soundEnabled) playNotificationTone();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title, { body: notification.content, icon: "/logo.png" });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, profile?.id, soundEnabled]);

  const markAllRead = async () => {
    if (!profile?.id || unreadCount === 0) return;
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
  };

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
  };

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    localStorage.setItem(SOUND_KEY, nextValue ? "on" : "off");
    if (nextValue) playNotificationTone();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="app-icon-button relative" aria-label="Abrir notificaciones">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bell className="h-4 w-4" aria-hidden="true" />
          )}
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))]">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notificaciones</DropdownMenuLabel>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar leídas
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Sin notificaciones pendientes</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="items-start gap-3 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{notification.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{notification.content}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); toggleSound(); }} className="gap-3">
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Sonido de alertas
          <span className="ml-auto text-xs text-muted-foreground">{soundEnabled ? "Activo" : "Silenciado"}</span>
        </DropdownMenuItem>
        {"Notification" in window && Notification.permission !== "granted" && (
          <DropdownMenuItem onSelect={() => void requestBrowserPermission()} className="gap-3">
            <Bell className="h-4 w-4" />
            Activar avisos del navegador
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
