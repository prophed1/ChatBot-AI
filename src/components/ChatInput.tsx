import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Paperclip, X, FileText, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Attachment } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (value: string | ((prev: string) => string)) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  attachments: Attachment[];
  setAttachments: (att: Attachment[]) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  attachments,
  setAttachments,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input, attachments]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setInput((prev: string) => prev ? prev + ' ' + finalTranscript : finalTranscript);
        }
      };
      recognitionRef.current.onend = () => {
         setIsRecording(false);
      };
    }
    return () => {
       if (recognitionRef.current) {
          recognitionRef.current.stop();
       }
    };
  }, []);

  const toggleRecording = () => {
     if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
     } else {
        recognitionRef.current?.start();
        setIsRecording(true);
     }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachments.length > 0) && !isLoading) {
        onSubmit(e as any);
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
       const file = files[i];
       const isImage = file.type.startsWith('image/');
       
       const reader = new FileReader();
       reader.onload = (event) => {
         const result = event.target?.result as string;
         setAttachments([...attachments, {
           type: isImage ? 'image' : 'file',
           name: file.name,
           data: result
         }]);
       };
       
       if (isImage) {
         reader.readAsDataURL(file);
       } else {
         reader.readAsText(file);
       }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="relative w-full max-w-3xl border border-[#3E3E3E] bg-[#2D2D2D]/80 backdrop-blur-md rounded-2xl mx-auto shadow-sm focus-within:border-[#555] transition-colors overflow-hidden flex flex-col">
      <AnimatePresence>
         {attachments.length > 0 && (
           <motion.div 
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             className="flex flex-wrap gap-2 pt-3 px-3 overflow-hidden"
           >
             {attachments.map((att, i) => (
               <div key={i} className="relative group flex items-center gap-2 bg-[#3A3A3A] hover:bg-[#444] transition-colors rounded-lg px-2.5 py-1.5 border border-[#4A4A4A]">
                  {att.type === 'image' ? (
                     <div className="w-6 h-6 rounded bg-[#2D2D2D] overflow-hidden shrink-0">
                        <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                     </div>
                  ) : (
                     <FileText size={16} className="text-[#A0C4FF]" />
                  )}
                  <span className="text-xs text-[#EAEAEA] max-w-[120px] truncate">{att.name}</span>
                  <button 
                     type="button"
                     onClick={() => removeAttachment(i)}
                     className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#555] hover:bg-[#777] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                     <X size={12} />
                  </button>
               </div>
             ))}
           </motion.div>
         )}
      </AnimatePresence>
      
      <form
        onSubmit={onSubmit}
        className="flex items-center w-full"
      >
        <button
          type="button"
          onClick={handleFileClick}
          className="p-3 text-[#A0A0A0] hover:text-[#D0D0D0] transition-colors mt-auto mb-1 ml-1 rounded-xl"
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>
        <button
          type="button"
          onClick={toggleRecording}
          className={`p-3 transition-colors mt-auto mb-1 rounded-xl ${isRecording ? 'text-red-400' : 'text-[#A0A0A0] hover:text-[#D0D0D0]'}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          onChange={handleFileChange}
          multiple
          accept="image/*,.txt,.json,.md,.csv,.log,.js,.ts,.html,.css"
        />
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can Claude help you today?"
          className="w-full max-h-[200px] min-h-[52px] bg-transparent text-[#ECECEC] placeholder:text-[#888] focus:outline-none resize-none py-3.5 px-2 text-[15px] block leading-relaxed"
          rows={1}
        />
        
        <div className="flex flex-col justify-end pb-2.5 pr-2.5 ml-2">
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className="p-1.5 flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-50 disabled:bg-transparent disabled:text-[#666] bg-white text-black hover:bg-gray-200 shadow-sm"
            aria-label="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
};
