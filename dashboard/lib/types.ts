export type AgentStatus = 'online' | 'idle' | 'busy' | 'offline';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  status: AgentStatus;
  lastActivity?: string;
}

export interface PodFile {
  name: string;
  task_id: string;
  title?: string;
  status: string;
  priority?: string;
  folder: 'inbox' | 'active' | 'archive' | 'failed';
}

export interface ActivityEvent {
  id: string;
  type: 'pod' | 'claude' | 'openclaw' | 'hermes' | 'system';
  message: string;
  timestamp: Date;
  color: string;
}
