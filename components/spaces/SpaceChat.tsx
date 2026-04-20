'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  edited: boolean;
  reaction_count: number;
  reply_count: number;
}

interface SpaceChatProps {
  spaceId: string;
  userId: string;
  spaceType: 'community' | 'group' | 'channel';
  userRole: string;
}

export default function SpaceChat({ spaceId, userId, spaceType, userRole }: SpaceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}/messages?limit=50`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content: newMessage.trim()
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const canSendMessages = () => {
    if (spaceType === 'channel') {
      return ['owner', 'admin'].includes(userRole);
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Cargando mensajes...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                {msg.user_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm">{msg.user_name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {msg.edited && (
                    <span className="text-xs text-gray-400">(editado)</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
                {(msg.reaction_count > 0 || msg.reply_count > 0) && (
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {msg.reaction_count > 0 && (
                      <button className="hover:text-blue-600">
                        👍 {msg.reaction_count}
                      </button>
                    )}
                    {msg.reply_count > 0 && (
                      <button className="hover:text-blue-600">
                        💬 {msg.reply_count} respuestas
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {canSendMessages() ? (
        <div className="border-t p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      ) : (
        <div className="border-t p-4 text-center text-sm text-gray-500">
          Solo los administradores pueden publicar en este canal
        </div>
      )}
    </div>
  );
}
