// modules/chat/ChatPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Avatar from '@/components/shared/Avatar';
import Badge from '@/components/shared/Badge';
import { supabase } from '@/lib/supabase';
import { Channel, Message, Profile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { 
  Hash, Search, Send, Smile, Paperclip, 
  Video, Info, Plus, UserPlus, PhoneCall 
} from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';

interface DmItem {
  id: string;
  name: string;
  status: 'online' | 'ausente' | 'ocupado' | 'offline';
  unread: number;
}

export default function ChatPage() {
  const profile = useAuthStore((state) => state.profile);
  const addToast = useNotificationsStore((state) => state.addToast);

  // States
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [activeChatType, setActiveChatType] = useState<'channel' | 'dm'>('channel');
  const [inputText, setInputText] = useState('');
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<DmItem[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Channels
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase.from('channels').select('*');
      if (data && data.length > 0) {
        setChannels(data);
        setActiveChatId(data[0].id);
      }
    };
    fetchChannels();
  }, []);

  // Fetch DMs list from profiles in the CRM
  useEffect(() => {
    const fetchDms = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const activeUserId = profile?.id;
        const otherProfiles = data
          .filter((p: any) => p.id !== activeUserId)
          .map((p: any) => ({
            id: p.id,
            name: p.full_name,
            status: p.status || 'offline',
            unread: 0
          }));
        setDms(otherProfiles);
      }
    };
    if (profile) {
      fetchDms();
    }
  }, [profile]);

  // Fetch Messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (data) {
        const grouped: Record<string, Message[]> = {};
        data.forEach((msg: Message) => {
          if (!grouped[msg.channel_id]) {
            grouped[msg.channel_id] = [];
          }
          grouped[msg.channel_id].push(msg);
        });
        setMessages(grouped);
      }
    };
    fetchMessages();
  }, [channels, dms]);

  useEffect(() => {
    // Scroll to bottom on active chat change or new message
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatId]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      channel_id: activeChatId,
      sender_id: profile?.id || '',
      content: inputText,
      reactions: {},
      is_system: false
    };

    const { data } = await supabase.from('messages').insert(newMessage);
    if (data && data[0]) {
      setMessages((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), data[0]]
      }));
    }

    setInputText('');

    // Trigger mock auto-reply for DMs
    if (activeChatType === 'dm') {
      setTimeout(async () => {
        const dmAgent = dms.find((d) => d.id === activeChatId);
        if (dmAgent) {
          const autoReply = {
            channel_id: activeChatId,
            sender_id: dmAgent.id,
            content: 'Recibido, te respondo en un momento 👍. Estoy revisando el pipeline.',
            reactions: {},
            is_system: false
          };
          const { data: repData } = await supabase.from('messages').insert(autoReply);
          if (repData && repData[0]) {
            setMessages((prev) => ({
              ...prev,
              [activeChatId]: [...(prev[activeChatId] || []), repData[0]]
            }));
            addToast({
              title: `Mensaje de ${dmAgent.name}`,
              description: 'Recibiste una nueva respuesta.',
              type: 'info',
            });
          }
        }
      }, 1500);
    }
  };

  const getSenderName = (id: string | null) => {
    if (id === profile?.id) return 'Tú';
    const found = dms.find((d) => d.id === id);
    if (found) return found.name;
    return 'Sistema';
  };


  const activeChatTitle = () => {
    if (activeChatType === 'channel') {
      const chan = channels.find((c) => c.id === activeChatId);
      return chan ? `# ${chan.name}` : '# general';
    } else {
      const dm = dms.find((d) => d.id === activeChatId);
      return dm ? dm.name : 'Agente';
    }
  };

  const statusColors = {
    online: 'bg-kovex-success',
    ausente: 'bg-kovex-warning',
    ocupado: 'bg-kovex-danger',
    offline: 'bg-kovex-muted',
  };

  return (
    <div className="flex bg-[#0F1525]/30 border border-kovex-border rounded-2xl h-[calc(100vh-140px)] min-h-[460px] overflow-hidden select-none animate-fade-in text-kovex-text">
      {/* Sidebar (260px) */}
      <aside className="w-64 border-r border-kovex-border bg-black/10 flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Channels Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] text-kovex-muted font-bold tracking-wider uppercase">Canales</span>
              <button 
                onClick={() => addToast({ title: 'Nuevo Canal', description: 'Creación de canal restringida por rol.', type: 'warning' })}
                className="text-kovex-muted hover:text-white p-0.5 rounded transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {channels.map((chan) => {
                const active = activeChatId === chan.id;
                return (
                  <button
                    key={chan.id}
                    onClick={() => {
                      setActiveChatId(chan.id);
                      setActiveChatType('channel');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all ${
                      active
                        ? 'bg-kovex-primary/10 text-white font-bold'
                        : 'text-kovex-muted hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Hash size={14} className={active ? 'text-kovex-primary' : ''} />
                    <span>{chan.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DMs Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] text-kovex-muted font-bold tracking-wider uppercase">Mensajes Directos</span>
            </div>
            <div className="space-y-1">
              {dms.map((dm) => {
                const active = activeChatId === dm.id;
                return (
                  <button
                    key={dm.id}
                    onClick={() => {
                      setActiveChatId(dm.id);
                      setActiveChatType('dm');
                      // Clear unread badge
                      setDms(dms.map(d => d.id === dm.id ? { ...d, unread: 0 } : d));
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                      active
                        ? 'bg-kovex-primary/10 text-white font-bold'
                        : 'text-kovex-muted hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={dm.name} size="sm" />
                      <span>{dm.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColors[dm.status]}`} />
                    </div>
                    {dm.unread > 0 && (
                      <span className="bg-kovex-primary text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                        {dm.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col h-full bg-[#080C18]/40">
        {/* Header */}
        <header className="h-14 border-b border-kovex-border px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-display font-bold text-white text-sm">{activeChatTitle()}</h3>
            <span className="text-[10px] text-kovex-muted font-semibold bg-white/[0.03] px-2 py-0.5 rounded-md uppercase tracking-wider">
              {activeChatType === 'channel' ? 'Canal Público' : 'Chat Agente'}
            </span>
          </div>

          <div className="flex gap-2">
            <button className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors">
              <Video size={16} />
            </button>
            <button className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors">
              <Info size={16} />
            </button>
          </div>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(messages[activeChatId] || []).map((msg) => {
            const isMine = msg.sender_id === profile?.id;
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[70%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
                <Avatar name={getSenderName(msg.sender_id)} size="sm" />
                <div>
                  <div className={`flex items-baseline gap-2 mb-1 text-[10px] text-kovex-muted ${isMine ? 'justify-end' : ''}`}>
                    <span className="font-bold text-kovex-text">{getSenderName(msg.sender_id)}</span>
                    <span>•</span>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    className={`text-xs p-3.5 rounded-2xl leading-relaxed ${
                      isMine
                        ? 'bg-kovex-primary/15 text-white rounded-tr-sm border border-kovex-primary/20'
                        : 'bg-kovex-surface text-kovex-text rounded-tl-sm border border-kovex-border'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input Footer */}
        <div className="p-4 border-t border-kovex-border bg-black/10 flex-shrink-0">
          <div className="flex items-center gap-3 bg-kovex-surface border border-kovex-border rounded-xl px-4 py-2.5">
            <button className="text-kovex-muted hover:text-white transition-colors">
              <Paperclip size={16} />
            </button>
            <input
              type="text"
              placeholder="Escribe un mensaje aquí..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-transparent border-0 outline-none text-white text-xs placeholder-kovex-muted"
            />
            <button className="text-kovex-muted hover:text-white transition-colors">
              <Smile size={16} />
            </button>
            <button
              onClick={handleSendMessage}
              className="w-8 h-8 rounded-lg bg-kovex-primary hover:brightness-105 active:scale-[0.96] flex items-center justify-center text-white transition-all shadow-md"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
