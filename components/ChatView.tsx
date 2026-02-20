
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';
import { ICONS } from '../constants';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: input }] }].slice(-10) as any,
        config: {
          temperature: 0.7,
        }
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.text || "I couldn't generate a response.",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Error: Could not connect to Gemini API.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4">
      <div className="flex-1 overflow-y-auto py-8 space-y-6" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center mt-20 opacity-40">
            <ICONS.Chat />
            <p className="mt-4 text-lg">Start a conversation with Gemini Flash</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-slate-800 text-slate-100 border border-slate-700'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 animate-pulse flex items-center gap-2">
              <ICONS.Loader />
              <span>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="pb-8 pt-4">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xl text-lg"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ICONS.Send />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
