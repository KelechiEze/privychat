export interface Message {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderInitials?: string;
  text: string;
  time: string;
  isSelf: boolean;
  reactions?: string[];
  receiptStatus?: 'sent' | 'delivered' | 'read'; // WhatsApp-like single, double gray, or double blue checkmarks
  isRead?: boolean; // For incoming messages, to indicate if the current user has read it or not
  image?: string; // Optional image attachment URL or data URL
  isStarred?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface Participant {
  name: string;
  role: string;
  avatar: string;
  isOnline: boolean;
}

export interface SharedFile {
  name: string;
  size: string;
  date: string;
  messageId?: string; // Reference to the message that contains this file
  fileUrl?: string; // URL or data URL of the file
  fileType?: 'Documents' | 'Photos' | 'Movies' | 'Other'; // Type of file
  isLink?: boolean; // Whether this is a link
}

export interface SharedFileGroup {
  type: 'Documents' | 'Photos' | 'Movies' | 'Other';
  filesCount: number;
  totalSize: string;
  colorClass: string;
  items: SharedFile[];
}

export interface Chat {
  id: string;
  name: string;
  type: 'group' | 'direct';
  avatar: string;
  avatarInitials?: string;
  avatarColor?: string;
  statusText?: string;
  isTyping?: boolean;
  typingUser?: string;
  messages: Message[];
  unreadCount?: number; // WhatsApp-like unread ticket counter in red
  membersCount: number;
  filesCount: number;
  linksCount: number;
  sharedFiles: SharedFileGroup[];
  isMuted?: boolean;
  isArchived?: boolean;
}