import React, { useState, useRef, useEffect } from 'react';
import { User, Sparkles, AlertCircle, Download, Trash2, ChevronDown, Image as ImageIcon, FileText, Menu, Plus, Search, MessageSquare, Mic, MicOff, Edit, RefreshCcw, Volume2, VolumeX, FolderPlus, Folder, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ChatInput } from './components/ChatInput';
import { Message, Attachment, AIModel, ChatSession, Project, Persona } from './types';
import jsPDF from 'jspdf';

const DEFAULT_PERSONAS: Persona[] = [
  { id: 'default', name: 'Default Assistant', prompt: 'You are a helpful AI assistant.' },
  { id: 'expert-coder', name: 'Expert Programmer', prompt: 'You are an expert programmer. Provide clean, efficient code without unnecessary explanations unless asked.' },
  { id: 'creative-writer', name: 'Creative Writer', prompt: 'You are a creative writer. Use evocative language, metaphors, and imaginative flair in your responses.' }
];

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('claudeHistory_sessions');
      if (saved) return JSON.parse(saved);
      
      const oldSaved = localStorage.getItem('claudeHistory');
      if (oldSaved) {
        const parsed = JSON.parse(oldSaved);
        if (parsed.length > 0) {
          return [{
            id: 'legacy_session',
            title: parsed[0].content.slice(0, 30) || 'Previous Chat',
            messages: parsed,
            updatedAt: Date.now()
          }];
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('claudeHistory_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
      const oldSaved = localStorage.getItem('claudeHistory');
      if (oldSaved && JSON.parse(oldSaved).length > 0) return 'legacy_session';
    } catch {}
    return null;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [models, setModels] = useState<AIModel[]>([{ id: 'claude-sonnet-4-5', name: 'Claude 3.5 Sonnet' }]);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5');
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('claudeHistory_projects');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [personas, setPersonas] = useState<Persona[]>(() => {
    try {
       const saved = localStorage.getItem('ai_personas');
       if (saved) return JSON.parse(saved);
       return DEFAULT_PERSONAS;
    } catch {
       return DEFAULT_PERSONAS;
    }
  });
  
  const [selectedPersonaId, setSelectedPersonaId] = useState('default');
  const [isPersonasOpen, setIsPersonasOpen] = useState(false);

  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    localStorage.setItem('claudeHistory_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('ai_personas', JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {

    localStorage.setItem('claudeHistory_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId) {
       const session = sessions.find(s => s.id === currentSessionId);
       if (session) setMessages(session.messages);
    } else {
       setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then((data: any) => {
        if (data && data.data) {
           const validModels = data.data.filter((m: any) => {
               const id = m.id.toLowerCase();
               const name = m.name ? m.name.toLowerCase() : '';
               return id.includes('claude') || name.includes('claude') || id.includes('gpt') || name.includes('gpt');
           });
           if (validModels.length > 0) {
             setModels(validModels);
             if (!validModels.find((m: any) => m.id === selectedModel)) {
               setSelectedModel(validModels[0].id);
             }
           }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: isLoading ? 'auto' : 'smooth',
      });
    }
  }, [messages, isLoading]);

  const handleDeleteSession = (id: string) => {
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    const doc = new jsPDF();
    let y = 10;
    const margin = 10;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(16);
    const sessionTitle = currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title || 'Chat Export' : 'Chat Export';
    doc.text(sessionTitle, margin, y);
    y += 10;
    
    doc.setFontSize(11);
    
    messages.forEach(m => {
      const roleText = m.role.toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.text(roleText + ':', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(m.content, pageWidth - margin * 2);
      
      contentLines.forEach((line: string) => {
         if (y > pageHeight - margin) {
           doc.addPage();
           y = margin;
         }
         doc.text(line, margin, y);
         y += 5;
      });
      
      y += 5;
    });
    
    doc.save(`chat-export-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const toggleSpeak = (text: string, index: number) => {
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingIndex(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingIndex(index);
    }
  };

  const handleCreateProject = () => {
    const name = window.prompt("Enter project name:");
    if (name) {
      setProjects([...projects, { id: Date.now().toString(), name }]);
    }
  };

  const executeAIFetch = async (newMessages: Message[], sessionId: string) => {
    setIsLoading(true);
    setError(null);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const activePersona = personas.find(p => p.id === selectedPersonaId) || DEFAULT_PERSONAS[0];
      
      const apiMessages = [];
      if (activePersona.prompt && activePersona.id !== 'default') {
         apiMessages.push({ role: 'system', content: activePersona.prompt });
      }

      newMessages.forEach(msg => {
         if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
            const contentArray: any[] = [];
            if (msg.content) {
               contentArray.push({ type: 'text', text: msg.content });
            }
            msg.attachments.forEach(att => {
               if (att.type === 'image') {
                  contentArray.push({ type: 'image_url', image_url: { url: att.data } });
               } else {
                  contentArray.push({ type: 'text', text: `\n\n--- Attached File: ${att.name} ---\n${att.data}` });
               }
            });
            apiMessages.push({ role: msg.role, content: contentArray });
         } else {
            apiMessages.push({ role: msg.role, content: msg.content });
         }
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, messages: apiMessages }),
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received an HTML page instead of API response. The proxy server is still restarting. Please wait 10 seconds and try again.');
      }

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        throw new Error(errData.error || 'Failed to fetch response.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('No stream available');
      let currentStreamText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0]?.delta?.content) {
                currentStreamText += data.choices[0].delta.content;
              } else if (data.type === 'content_block_delta' && data.delta?.text) {
                currentStreamText += data.delta.text;
              }
            } catch (e) {}
          }
        }
        
        if (!chunk.includes('data: ')) {
           currentStreamText += chunk;
        }

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = currentStreamText.replace(/undefined/g, ''); 
          setSessions(sessPrev => sessPrev.map(s => s.id === sessionId ? { ...s, messages: updated, updatedAt: Date.now() } : s));
          return updated;
        });
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred while communicating with the API.');
      setMessages(prev => {
        if (prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = (index: number) => {
    if (isLoading || !currentSessionId) return;
    const newMessages = messages.slice(0, index);
    setMessages(newMessages);
    executeAIFetch(newMessages, currentSessionId);
  };

  const handleEditSave = (index: number) => {
    if (isLoading || !currentSessionId || !editValue.trim()) return;
    
    // We update the message at `index`, then truncate anything after it
    const updatedMessages = messages.slice(0, index + 1);
    updatedMessages[index] = { ...updatedMessages[index], content: editValue.trim() };
    
    setEditingIndex(null);
    setEditValue('');
    setMessages(updatedMessages);
    executeAIFetch(updatedMessages, currentSessionId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage = input.trim();
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    setError(null);

    const newMsg: Message = { role: 'user', content: userMessage };
    if (currentAttachments.length > 0) {
       newMsg.attachments = currentAttachments;
    }

    const newMessages: Message[] = [...messages, newMsg];
    
    let sessionId = currentSessionId;
    if (!sessionId) {
       sessionId = Date.now().toString();
       setCurrentSessionId(sessionId);
       const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
       setSessions(prev => [{ id: sessionId, title, messages: newMessages, updatedAt: Date.now(), projectId: activeProjectId || undefined, systemPrompt: selectedPersonaId }, ...prev]);
    } else {
       setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s));
    }
    
    setMessages(newMessages);
    executeAIFetch(newMessages, sessionId);
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProject = activeProjectId ? s.projectId === activeProjectId : true;
    return matchesSearch && matchesProject;
  }).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-screen w-full bg-[#1F1F1F] text-[#ECECEC] font-sans selection:bg-[#4d6a8a] selection:text-white overflow-hidden">
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 sm:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
             initial={{ width: 0, opacity: 0 }}
             animate={{ width: 280, opacity: 1 }}
             exit={{ width: 0, opacity: 0 }}
             className="flex flex-col bg-[#1A1A1A] border-r border-[#2D2D2D] h-full shrink-0 z-30 fixed sm:relative"
          >
             {/* Sidebar Header (New Chat & Search) */}
             <div className="p-4 flex flex-col gap-4">
                <button 
                  onClick={() => { setCurrentSessionId(null); setIsSidebarOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-[#ECECEC] text-[#1F1F1F] hover:bg-white transition-colors rounded-xl text-sm font-semibold shadow-sm justify-center"
                >
                   <Plus size={18} strokeWidth={2.5} />
                   Start New Chat
                </button>
                <div className="relative">
                   <Search size={14} className="absolute left-3 top-2.5 text-[#888]" />
                   <input 
                     type="text" 
                     placeholder="Search history..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-[#252525] border border-[#3E3E3E] rounded-lg py-2 pl-9 pr-3 text-sm text-[#ECECEC] focus:outline-none focus:border-[#555] transition-colors placeholder:text-[#666]"
                   />
                </div>
             </div>
             
             {/* Session List */}
             <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-1 list-none custom-scrollbar">
                
                <div className="flex items-center justify-between px-3 py-1 mt-2 mb-1">
                   <div className="text-xs font-semibold tracking-wider text-[#666] uppercase">Projects / Spaces</div>
                   <button onClick={handleCreateProject} className="text-[#888] hover:text-[#CCC] transition-colors"><FolderPlus size={14}/></button>
                </div>
                
                <div 
                   onClick={() => setActiveProjectId(null)}
                   className={`flex items-center gap-2.5 group px-3 py-2 cursor-pointer rounded-lg transition-colors ${
                     activeProjectId === null ? 'bg-[#2D2D2D] text-white' : 'hover:bg-[#252525] text-[#A0A0A0]'
                   }`}
                >
                   <Folder size={14} className={activeProjectId === null ? 'text-white' : 'text-[#888]'} />
                   <span className="truncate text-sm flex-1 font-medium">All Chats</span>
                </div>

                {projects.map(p => (
                   <div 
                     key={p.id}
                     onClick={() => setActiveProjectId(p.id)}
                     className={`flex items-center gap-2.5 group px-3 py-2 cursor-pointer rounded-lg transition-colors ${
                       activeProjectId === p.id ? 'bg-[#2D2D2D] text-white' : 'hover:bg-[#252525] text-[#A0A0A0]'
                     }`}
                   >
                      <Folder size={14} className={activeProjectId === p.id ? 'text-white' : 'text-[#888]'} />
                      <span className="truncate text-sm flex-1 font-medium">{p.name}</span>
                      <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm('Delete project? Chats will remain in All Chats.')) {
                               setProjects(projects.filter(pr => pr.id !== p.id));
                               if (activeProjectId === p.id) setActiveProjectId(null);
                            }
                         }}
                         className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#444] rounded text-[#888] hover:text-red-400 transition-all shrink-0"
                      >
                         <Trash2 size={12} />
                      </button>
                   </div>
                ))}
                
                <div className="h-px bg-[#333] my-3 mx-2"></div>

                <div className="px-3 py-1 mb-1 text-xs font-semibold tracking-wider text-[#666] uppercase">Chat History</div>
                {filteredSessions.map(session => (
                   <div 
                     key={session.id}
                     onClick={() => { setCurrentSessionId(session.id); setIsSidebarOpen(false); }}
                     className={`flex items-center gap-2.5 group px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${
                       currentSessionId === session.id ? 'bg-[#2D2D2D] text-white' : 'hover:bg-[#252525] text-[#A0A0A0]'
                     }`}
                   >
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="truncate text-[13px] flex-1 font-medium">{session.title}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#444] rounded text-[#888] hover:text-red-400 transition-all shrink-0"
                      >
                         <Trash2 size={13} />
                      </button>
                   </div>
                ))}
                {filteredSessions.length === 0 && (
                   <div className="text-center text-[#666] text-sm mt-4 italic">No history found</div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area Context flex-col */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden relative min-w-0">
        
        {/* Top Header */}
        <header className="flex items-center justify-between p-4 sticky top-0 z-10 bg-[#1F1F1F] bg-opacity-95 backdrop-blur-md border-b border-[#2D2D2D]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#2D2D2D] rounded-xl text-[#A0A0A0] hover:text-white transition-colors flex-shrink-0"
              title="Toggle Sidebar"
            >
               <Menu size={20} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setIsPersonasOpen(!isPersonasOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#2D2D2D] rounded-lg transition-colors text-sm text-[#A0A0A0] hover:text-white border border-transparent hover:border-[#3E3E3E]"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Persona: {personas.find(p => p.id === selectedPersonaId)?.name || 'Default Assistant'}</span>
                <ChevronDown size={14} />
              </button>
              
              {isPersonasOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#252525] border border-[#3E3E3E] rounded-xl shadow-xl z-50 overflow-hidden text-sm">
                  <div className="px-3 py-2 text-xs font-semibold tracking-wider text-[#888] uppercase border-b border-[#333]">System Persona</div>
                  {personas.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPersonaId(p.id); setIsPersonasOpen(false); }}
                      className={`px-3 py-2 cursor-pointer hover:bg-[#333] transition-colors flex flex-col gap-0.5 ${selectedPersonaId === p.id ? 'bg-[#333] text-white' : 'text-[#CCC]'}`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-[#888] truncate">{p.prompt}</span>
                    </div>
                  ))}
                  <div 
                    className="px-3 py-2 border-t border-[#333] hover:bg-[#333] cursor-pointer text-[#A0C4FF] transition-colors font-medium text-center"
                    onClick={() => {
                        const name = window.prompt("Persona Name:");
                        const prompt = window.prompt("System Instructions:");
                        if (name && prompt) {
                            const newPersona = { id: Date.now().toString(), name, prompt };
                            setPersonas([...personas, newPersona]);
                            setSelectedPersonaId(newPersona.id);
                            setIsPersonasOpen(false);
                        }
                    }}
                  >
                     + Custom Persona
                  </div>
                </div>
              )}
            </div>
          </div>
        
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2D2D2D] rounded-lg transition-colors text-sm text-[#A0A0A0] hover:text-white"
              title="Export Chat as PDF"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </header>

        {/* Main Chat Content */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto pb-32 pt-4 px-4 scroll-smooth" onClick={() => setIsModelsOpen(false)}>
        <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-8">
          
          {messages.length === 0 && (
            <div className="h-full mt-[12vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#3E3E3E] to-[#2D2D2D] border py-2 border-[#4A4A4A] flex items-center justify-center mb-6 shadow-xl">
                <Sparkles size={28} className="text-[#ECECEC]" />
              </div>
              <h1 className="text-3xl font-semibold mb-3 tracking-tight">How can I help you today?</h1>
              <p className="text-[#999] max-w-sm mb-12">I'm ready to assist with writing, analysis, coding, and more.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  "Draft a professional email",
                  "Explain quantum computing",
                  "Write a React script for a counter",
                  "Analyze some data",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => document.querySelector('form')?.dispatchEvent(
                            new Event('submit', { cancelable: true, bubbles: true })
                        ), 10);
                    }}
                    className="p-4 rounded-xl border border-[#333] bg-[#292929]/50 hover:bg-[#333333] transition-colors text-left text-sm text-[#CCC]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {msg.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-[#E5E5E5] flex items-center justify-center shadow-sm">
                      <Sparkles size={16} className="text-[#1F1F1F]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#3E3E3E] flex items-center justify-center shadow-sm">
                      <User size={16} className="text-[#ECECEC]" />
                    </div>
                  )}
                </div>

                <div 
                  className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 ${
                    msg.role === 'user'
                      ? 'bg-[#2D2D2D] rounded-2xl rounded-tr-sm text-[#EAEAEA]'
                      : 'bg-transparent text-[#EAEAEA] -ml-2 -mt-1 w-full'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="flex flex-col gap-3 group/msg">
                       {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-1">
                             {msg.attachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-2 bg-[#3A3A3A] px-2.5 py-1.5 rounded-lg border border-[#4A4A4A]">
                                   {att.type === 'image' ? (
                                     <ImageIcon size={16} className="text-[#A0C4FF]" />
                                   ) : (
                                     <FileText size={16} className="text-[#A0C4FF]" />
                                   )}
                                   <span className="text-xs text-[#EAEAEA] truncate max-w-[150px]">{att.name}</span>
                                </div>
                             ))}
                          </div>
                       )}
                       {editingIndex === index ? (
                         <div className="flex flex-col gap-2 w-full min-w-[200px] sm:min-w-[300px]">
                           <textarea
                             value={editValue}
                             onChange={(e) => setEditValue(e.target.value)}
                             className="w-full bg-[#1A1A1A] text-[#ECECEC] p-3 rounded-lg border border-[#4A4A4A] resize-none focus:outline-none focus:border-[#666] text-sm"
                             rows={3}
                           />
                           <div className="flex justify-end gap-2">
                             <button
                               onClick={() => setEditingIndex(null)}
                               className="px-3 py-1.5 text-xs text-[#AAA] hover:text-white transition-colors"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={() => handleEditSave(index)}
                               className="px-3 py-1.5 text-xs bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
                             >
                               Save & Send
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="relative">
                           {msg.content && <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>}
                           <div className="absolute -bottom-8 right-0 opacity-0 group-hover/msg:opacity-100 transition-all">
                             <button
                               onClick={() => { setEditingIndex(index); setEditValue(msg.content); }}
                               className="p-1.5 text-[#888] hover:text-white bg-[#252525] hover:bg-[#333] rounded-lg shadow-sm border border-[#3E3E3E] transition-colors"
                               title="Edit Message"
                             >
                                <Edit size={14} />
                             </button>
                           </div>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="group/msg relative w-full">
                      <MarkdownRenderer content={msg.content} />
                      {msg.content && !isLoading && (
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-[#1F1F1F] rounded-lg">
                          <button
                            onClick={() => toggleSpeak(msg.content, index)}
                            className="p-1.5 text-[#A0A0A0] hover:text-white hover:bg-[#2D2D2D] rounded-md transition-colors"
                            title={speakingIndex === index ? "Stop voice" : "Read aloud"}
                          >
                             {speakingIndex === index ? <VolumeX size={15} /> : <Volume2 size={15} />}
                          </button>
                          <button
                            onClick={() => handleRegenerate(index)}
                            className="p-1.5 text-[#A0A0A0] hover:text-white hover:bg-[#2D2D2D] rounded-md transition-colors flex items-center gap-1.5"
                            title="Regenerate response"
                          >
                             <RefreshCcw size={14} />
                             <span className="text-xs font-medium">Retry</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto w-full p-4 rounded-xl bg-red-900/20 border border-red-900/50 flex flex-col sm:flex-row items-center gap-3 text-red-200 mt-2"
            >
              <AlertCircle size={20} className="shrink-0" />
              <div className="flex-1 text-sm">{error}</div>
            </motion.div>
          )}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex gap-4 max-w-3xl ml-4">
                 <div className="w-8 h-8 rounded-full bg-[#E5E5E5] animate-pulse flex items-center justify-center">
                    <Sparkles size={16} className="text-[#1F1F1F]" />
                  </div>
             </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1F1F1F] via-[#1F1F1F] to-transparent pt-12">
        <div className="max-w-3xl mx-auto w-full relative flex flex-col gap-2">
          
          <div className="relative self-start">
             <button
                onClick={() => setIsModelsOpen(!isModelsOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A0A0A0] hover:text-[#ECECEC] hover:bg-[#333] border border-transparent hover:border-[#444] rounded-lg transition-colors font-medium bg-[#2A2A2A]"
             >
                <Sparkles size={12} className="text-[#888]" />
                {models.find(m => m.id === selectedModel)?.name || selectedModel}
                <ChevronDown size={12} className="opacity-60 ml-0.5" />
             </button>
             
             <AnimatePresence>
             {isModelsOpen && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 10 }}
                 className="absolute bottom-full left-0 mb-2 w-72 bg-[#252525] border border-[#3E3E3E] rounded-xl shadow-2xl z-50 overflow-hidden text-sm max-h-[350px] flex flex-col"
               >
                  <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-[#666] uppercase border-b border-[#333] shadow-sm select-none">
                    Select AI Model
                  </div>
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                  {models.map(m => {
                     const isFast = m.id.toLowerCase().includes('nano') || m.id.toLowerCase().includes('mini') || m.id.toLowerCase().includes('flash') || m.id.toLowerCase().includes('haiku');
                     const isBest = m.id.toLowerCase().includes('opus') || m.id.toLowerCase().includes('4.5') || m.id.toLowerCase().includes('4-5') || m.id.toLowerCase().includes('5.5') || m.id.toLowerCase().includes('gpt-4');
                     
                     return (
                       <div 
                         key={m.id}
                         className={`px-3 py-2.5 cursor-pointer flex items-center justify-between hover:bg-[#333] transition-colors relative ${selectedModel === m.id ? 'bg-[#333] text-white' : 'text-[#CCC]'}`}
                         onClick={() => {
                            setSelectedModel(m.id);
                            setIsModelsOpen(false);
                         }}
                       >
                         <div className="flex flex-col gap-0.5 pr-2">
                            <span className="font-medium flex items-center gap-1.5">
                              {m.name || m.id}
                            </span>
                            <span className="text-[10px] opacity-50 font-mono tracking-tight">{m.id}</span>
                         </div>
                         {isFast && <span className="text-[9px] uppercase tracking-wider font-bold bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 shrink-0">Fastest</span>}
                         {isBest && <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">Best Quality</span>}
                       </div>
                     );
                  })}
                  </div>
               </motion.div>
             )}
             </AnimatePresence>
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            attachments={attachments}
            setAttachments={setAttachments}
          />
          <div className="text-center mt-3 text-xs text-[#777]">
            Claude can make mistakes. Please double-check responses.
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
