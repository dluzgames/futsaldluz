import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { getTacticalAdvice } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  boardState: any;
  onUpdate: (state: any) => void;
  onPlayAnimation: () => Promise<void>;
  onSaveTactic: (name: string) => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ boardState, onUpdate, onPlayAnimation, onSaveTactic }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu assistente tático. Como posso ajudar com sua estratégia hoje?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const response = await getTacticalAdvice(userMessage, boardState);
      
      // Check for function calls
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'updateBoardWithAnimation') {
          const { frames, explanation } = call.args as any;
          
          // Update board with frames and start animation
          onUpdate({ frames });
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: explanation || 'Entendido! Veja a jogada que preparei para você.',
            timestamp: new Date()
          }]);

          // Small delay before starting animation to let user read
          setTimeout(() => {
            onPlayAnimation();
          }, 1000);
        } else if (call.name === 'saveTactic') {
          const { name } = call.args as any;
          onSaveTactic(name);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Tática "${name}" salva com sucesso! Você pode encontrá-la na lista à esquerda.`,
            timestamp: new Date()
          }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text || 'Desculpe, não consegui processar isso.', timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro ao consultar a IA.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-bottom border-slate-700/50 bg-slate-800/50 flex items-center gap-2">
        <Bot size={20} className="text-blue-400" />
        <h2 className="font-display font-bold text-lg">Assistente Tático IA</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3 rounded-2xl flex gap-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                {msg.role === 'assistant' && <Bot size={18} className="shrink-0 mt-1 opacity-50" />}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.role === 'user' && <User size={18} className="shrink-0 mt-1 opacity-50" />}
              </div>
              <span className={`text-[10px] text-slate-500 mt-1 ${msg.role === 'user' ? 'mr-2' : 'ml-2'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 p-3 rounded-2xl flex items-center gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span>Analisando táticas...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre rodízios, marcação..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
