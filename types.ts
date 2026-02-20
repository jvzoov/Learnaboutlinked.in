
export type StudioTab = 'chat' | 'image' | 'video' | 'live';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  timestamp: number;
}
