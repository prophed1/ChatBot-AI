export interface Attachment {
  type: 'image' | 'file';
  name: string;
  data: string; // Base64 data URL for images, raw text for files
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export interface AIModel {
  id: string;
  name: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
