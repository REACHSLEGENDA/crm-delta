import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Channel, Message, Profile } from '../types';
import { 
  Hash, 
  MessageSquare, 
  Send, 
  Plus, 
  AlertCircle 
} from 'lucide-react';

interface ChatProps {
  currentProfile: Profile | null;
}

export default function Chat({ currentProfile }: ChatProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Channels and messages loading
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // New Channel Dialog Form (Toggle via classes)
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'dm'>('public');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;
    fetchMessages(selectedChannel.id);

    // Subscribe to REALTIME changes for messages in the selected channel
    const channelSubscription = supabase
      .channel(`realtime:messages:channel_${selectedChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        async (payload: any) => {
          // Fetch sender profile details to attach to the real-time message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();

          const receivedMessage: Message = {
            id: payload.new.id,
            channel_id: payload.new.channel_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            reactions: payload.new.reactions || {},
            created_at: payload.new.created_at,
            is_system: payload.new.is_system,
            sender: senderProfile ? { full_name: senderProfile.full_name } as any : undefined
          };

          setMessages(prev => {
            // Avoid duplicate additions
            if (prev.some(m => m.id === receivedMessage.id)) return prev;
            return [...prev, receivedMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannels = async () => {
    setChannelsLoading(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChannels(data || []);

      if (data && data.length > 0) {
        setSelectedChannel(data[0]);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setChannelsLoading(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(full_name)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !currentProfile) return;

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({
          name: newChannelName.trim(),
          type: newChannelType,
          members: [currentProfile.id],
          created_by: currentProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setChannels([...channels, data]);
      setNewChannelName('');
      setShowAddChannel(false);
      setSelectedChannel(data);
    } catch (err) {
      console.error('Error creating channel:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel || !currentProfile) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: selectedChannel.id,
          sender_id: currentProfile.id,
          content: newMessage.trim(),
          is_system: false
        });

      if (error) throw error;

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div style={{ display: 'flex', height: '82vh', gap: '20px' }}>
      {/* Channels Sidebar List */}
      <div className="glass-panel" style={{
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-gold)' }}>CANALES DE CHAT</h3>
          <button 
            onClick={() => setShowAddChannel(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-gold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Stable channels loader */}
        <div className={channelsLoading ? "flex" : "hidden"} style={{ padding: '20px', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px' }}>Cargando...</span>
        </div>

        {/* Channels scroll list */}
        <div className={channelsLoading ? "hidden" : "flex"} style={{ flexDirection: 'column', gap: '5px', overflowY: 'auto', flex: 1 }}>
          {channels.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '10px' }}>No hay canales</span>
          ) : (
            channels.map((chan) => (
              <button
                key={chan.id}
                onClick={() => setSelectedChannel(chan)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: selectedChannel?.id === chan.id ? 'rgba(212, 175, 55, 0.15)' : 'none',
                  border: 'none',
                  borderRadius: '6px',
                  color: selectedChannel?.id === chan.id ? 'var(--gold-light)' : 'var(--text-white)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: selectedChannel?.id === chan.id ? 600 : 400
                }}
                className="status-dropdown-item"
              >
                {chan.type === 'public' ? <Hash size={15} /> : <MessageSquare size={15} />}
                <span>{chan.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="glass-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {selectedChannel ? (
          <>
            {/* Chat header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ color: 'var(--text-gold)' }}>
                {selectedChannel.type === 'public' ? <Hash size={20} /> : <MessageSquare size={20} />}
              </span>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>{selectedChannel.name}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  Canal {selectedChannel.type} de Delta Capital
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {/* Stable messages loader */}
              <div className={messagesLoading && messages.length === 0 ? "flex" : "hidden"} style={{ justifyContent: 'center', padding: '20px' }}>
                <span style={{ fontSize: '13px' }}>Cargando mensajes del canal...</span>
              </div>

              {messages.map((msg) => {
                const isCurrentUser = msg.sender_id === currentProfile?.id;
                
                if (msg.is_system) {
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '5px 0' }}>
                      <span className="badge badge-info" style={{ fontSize: '11px', textTransform: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertCircle size={12} /> {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    alignSelf: isCurrentUser ? 'flex-end' : 'flex-start'
                  }}>
                    {/* Message Sender */}
                    {!isCurrentUser && (
                      <span style={{ fontSize: '11px', color: 'var(--text-gold)', fontWeight: 600, marginBottom: '3px', marginLeft: '4px' }}>
                        {msg.sender?.full_name || 'Colaborador'}
                      </span>
                    )}

                    {/* Bubble */}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isCurrentUser ? 'var(--gold-primary)' : 'var(--bg-dark-input)',
                      color: isCurrentUser ? 'var(--bg-dark-deep)' : 'var(--text-white)',
                      border: isCurrentUser ? 'none' : '1px solid var(--border-dark)',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                      wordBreak: 'break-word'
                    }}>
                      <p style={{ fontSize: '13px', lineHeight: '1.4' }}>{msg.content}</p>
                    </div>

                    {/* Message Date */}
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', alignSelf: isCurrentUser ? 'flex-end' : 'flex-start', marginRight: '4px', marginLeft: '4px' }}>
                      {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Send Input Box */}
            <form onSubmit={handleSendMessage} style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-dark)',
              display: 'flex',
              gap: '12px'
            }}>
              <input
                type="text"
                className="text-input"
                placeholder={`Mensaje en #${selectedChannel.name}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="gold-button" style={{ padding: '10px 18px' }}>
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', gap: '10px' }}>
            <MessageSquare size={48} style={{ color: 'var(--border-gold)' }} />
            <span>Selecciona o crea un canal para chatear.</span>
          </div>
        )}
      </div>

      {/* Add Channel Modal */}
      <div 
        className={showAddChannel ? "flex" : "hidden"}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 200,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          border: '1px solid var(--border-gold)'
        }}>
          <h3 className="gold-gradient-text" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Crear Nuevo Canal</h3>
          
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Nombre del Canal</label>
              <input 
                type="text" 
                className="text-input" 
                placeholder="ej-anuncios-ventas" 
                required 
                value={newChannelName} 
                onChange={(e) => setNewChannelName(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-gold)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Tipo de Canal</label>
              <select 
                className="text-input" 
                value={newChannelType} 
                onChange={(e) => setNewChannelType(e.target.value as 'public' | 'dm')}
              >
                <option value="public">Público (#)</option>
                <option value="dm">Mensaje Directo (DM)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowAddChannel(false)}>Cancelar</button>
              <button type="submit" className="gold-button">Crear</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
