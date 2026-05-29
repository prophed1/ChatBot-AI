export interface Attachment {
  type: 'image' | 'file';
  name: string;
  data: string; // Base64 data URL for images, raw text for files
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

export interface AIModel {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Persona {
  id: string;
  name: string;
  prompt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  projectId?: string;
  systemPrompt?: string;
}
