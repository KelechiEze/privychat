import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Paperclip, Smile, Send, Trash2, ShieldAlert, Upload, X, Image as ImageIcon, 
  Pin, Star, Archive, VolumeX, Volume2, Check, CheckCheck, 
  Mic, MicOff, Play, Pause, StopCircle, Clock, Loader2, ChevronDown
} from 'lucide-react';
import { Chat, Message } from '../types';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { 
  setTypingStatus, 
  listenToTypingStatus, 
  getCurrentUser, 
  listenToMessagesPaginated,
  loadMoreMessages,
  markAllMessagesAsRead,
  markMessageAsRead,
  sendMessage
} from '../services/chatService';

interface GroupChatWorkspaceProps {
  chat: Chat;
  onSendMessage: (chatId: string, text: string, imageUrl?: string) => void;
  onResetChat?: (chatId: string) => void;
  onUpdateMessage?: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  onDeleteMessage?: (chatId: string, messageId: string) => void;
  onUpdateChatStatus?: (chatId: string, updates: Partial<Chat>) => void;
}

const PROPERTY_PRESETS = [
  { name: "Modern Villa", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80" },
  { name: "Luxury Penthouse", url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" },
  { name: "Executive Suite", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80" },
  { name: "Cozy Residence", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80" },
];

export default function GroupChatWorkspace({
  chat,
  onSendMessage,
  onResetChat,
  onUpdateMessage,
  onDeleteMessage,
  onUpdateChatStatus
}: GroupChatWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'participants'>('messages');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [revealArchivedMessages, setRevealArchivedMessages] = useState(false);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  
  // Voice Message Playback States
  const [playingVoiceMessageId, setPlayingVoiceMessageId] = useState<string | null>(null);
  const [voiceMessageProgress, setVoiceMessageProgress] = useState<{ [key: string]: number }>({});
  const [voiceMessageDuration, setVoiceMessageDuration] = useState<{ [key: string]: number }>({});
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Typing indicator states
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Message listener cleanup
  const messageListenerRef = useRef<(() => void) | null>(null);

  // Load messages with real-time listener
  useEffect(() => {
    if (!chat?.id) return;
    
    setIsLoadingMessages(true);
    
    // Clean up previous listener
    if (messageListenerRef.current) {
      messageListenerRef.current();
    }
    
    // Set up real-time message listener
    const unsubscribe = listenToMessagesPaginated(chat.id, (newMessages) => {
      setMessages(newMessages);
      setIsLoadingMessages(false);
      setHasMoreMessages(newMessages.length >= 30); // If we got full page, there might be more
    });
    
    messageListenerRef.current = unsubscribe;
    
    // Mark messages as read when entering chat
    markAllMessagesAsRead(chat.id);
    
    return () => {
      if (messageListenerRef.current) {
        messageListenerRef.current();
      }
    };
  }, [chat?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Listen to typing status
  useEffect(() => {
    if (!chat.id) return;
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const unsubscribe = listenToTypingStatus(chat.id, currentUser.uid, (isTyping, userId) => {
      setIsOtherTyping(isTyping);
      if (isTyping && userId) {
        setTypingUserId(chat.name);
      }
    });
    
    return () => unsubscribe();
  }, [chat.id, chat.name]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.querySelectorAll('audio').forEach(audio => audio.remove());
    };
  }, []);

  // Load more messages (infinite scroll)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;
    
    setIsLoadingMore(true);
    const oldestMessage = messages[0];
    
    try {
      const olderMessages = await loadMoreMessages(chat.id, oldestMessage.timestamp);
      
      if (olderMessages.length === 0) {
        setHasMoreMessages(false);
      } else {
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMoreMessages(olderMessages.length >= 20);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        const trigger = document.querySelector('[title="Add Emoji"]');
        if (!trigger || !trigger.contains(target)) {
          setShowEmojiPicker(false);
        }
      }
      if (showAttachmentMenu && attachmentMenuRef.current && !attachmentMenuRef.current.contains(target)) {
        setShowAttachmentMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showAttachmentMenu]);

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setPendingImage(event.target.result);
          setShowAttachmentMenu(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTyping = () => {
    if (!getCurrentUser()) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setTypingStatus(chat.id, getCurrentUser()?.uid || '', true);
    
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(chat.id, getCurrentUser()?.uid || '', false);
    }, 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingImage && !audioBlob) return;
    
    try {
      if (audioBlob) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result && typeof event.target.result === 'string') {
            await onSendMessage(chat.id, inputText.trim() || '🎤 Voice message', event.target.result);
            setAudioBlob(null);
            setAudioUrl(null);
            setRecordingDuration(0);
            setShowRecordingInterface(false);
            setIsRecording(false);
            setIsPaused(false);
            setInputText('');
          }
        };
        reader.readAsDataURL(audioBlob);
        return;
      }
      
      await onSendMessage(chat.id, inputText.trim(), pendingImage || undefined);
      setInputText('');
      setPendingImage(null);
      
      // Clear typing status
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingStatus(chat.id, getCurrentUser()?.uid || '', false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // ========== VOICE RECORDING FUNCTIONS ==========
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        setShowRecordingInterface(true);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setShowRecordingInterface(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setPlaybackProgress(progress);
        }
      };
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const discardRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setShowRecordingInterface(false);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  // ========== VOICE MESSAGE PLAYBACK ==========
  const toggleVoiceMessagePlayback = (messageId: string, audioData: string) => {
    if (playingVoiceMessageId === messageId && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlayingVoiceMessageId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(audioData);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setPlayingVoiceMessageId(null);
      setVoiceMessageProgress(prev => ({ ...prev, [messageId]: 0 }));
    };

    audio.ontimeupdate = () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setVoiceMessageProgress(prev => ({ ...prev, [messageId]: progress }));
        
        if (!voiceMessageDuration[messageId]) {
          setVoiceMessageDuration(prev => ({ ...prev, [messageId]: audio.duration }));
        }
      }
    };

    audio.play().catch(error => {
      console.error('Error playing voice message:', error);
      setIsPlaying(false);
      setPlayingVoiceMessageId(null);
    });

    setPlayingVoiceMessageId(messageId);
    setIsPlaying(true);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="chat-workspace" className="flex-1 h-full bg-[#f1f4f8] flex flex-col justify-between overflow-hidden relative">
      
      {/* Top Header */}
      <div className="h-[60px] min-h-[60px] bg-[#f1f4f8] px-6 border-b border-[#e5e9f0] flex items-center justify-between select-none shrink-0">
        <div className="flex flex-col">
          <h2 className="text-[12px] font-bold text-[#1a2c3a] tracking-wide">
            {chat.name}
          </h2>
          <span className="text-[9px] text-[#00c5bc] font-bold tracking-wide">
            {chat.statusText || 'Online'}
          </span>
        </div>

        <div className="flex bg-[#e8ecf2] p-[3px] rounded-lg">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'messages' 
                ? 'bg-[#e4f8f7] text-[#00c5bc] shadow-xs' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Messages
          </button>
          
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'participants' 
                ? 'bg-[#e4f8f7] text-[#00c5bc] shadow-xs' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Participants
          </button>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {messages.filter(m => m.isPinned).length > 0 && (() => {
        const pinnedMessage = messages.find(m => m.isPinned)!;
        return (
          <div className="bg-[#e4f8f7] border-b border-[#00c5bc]/20 px-6 py-2 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Pin className="w-3.5 h-3.5 text-[#00c5bc] shrink-0 rotate-45" />
              <span className="text-[9.5px] uppercase font-black text-[#00c5bc] tracking-wider shrink-0">Pinned:</span>
              <span className="text-[10px] text-[#2c3d52] truncate font-bold">
                "{pinnedMessage.text || 'Media'}"
              </span>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById(`msg-block-${pinnedMessage.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-[9.5px] font-black text-[#00c5bc] hover:underline bg-white px-2 py-0.5 rounded-md"
            >
              Go to Message
            </button>
          </div>
        );
      })()}

      {/* Main Content */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 scrollbar-thin"
      >
        {activeTab === 'messages' ? (
          <>
            {/* Load More Messages Button */}
            {hasMoreMessages && messages.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="text-[9px] font-bold text-[#00c5bc] bg-white/80 hover:bg-white px-4 py-1.5 rounded-full border border-[#00c5bc]/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Load Earlier Messages
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoadingMessages && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#00c5bc] animate-spin" />
              </div>
            )}

            {/* Archived Messages Toggle */}
            {messages.some(m => m.isArchived) && (
              <div className="mx-auto bg-amber-50/45 border border-amber-200/40 py-1.5 px-3.5 rounded-full text-[9px] font-bold text-amber-700 flex items-center gap-2.5 mb-2">
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Some messages are archived</span>
                <button onClick={() => setRevealArchivedMessages(!revealArchivedMessages)}
                  className="bg-white hover:bg-amber-50 text-[#00c5bc] px-2 py-0.5 rounded border border-amber-200 font-black">
                  {revealArchivedMessages ? 'Hide' : 'Show All'}
                </button>
              </div>
            )}

            {/* Typing Indicator */}
            {isOtherTyping && (
              <div className="flex items-center gap-2 text-gray-500 text-[10.5px] select-none pl-10 mb-2">
                <span className="font-semibold text-[#00c5bc]">{typingUserId || 'Someone'} is typing</span>
                <span className="flex gap-1 items-center ml-1">
                  <span className="w-1.5 h-1.5 bg-[#00c5bc] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#00c5bc] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#00c5bc] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingMessages && messages.length === 0 && (
              <div className="flex items-center justify-center flex-1 py-12">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#e4f8f7] flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-[#00c5bc]" />
                  </div>
                  <p className="text-[12px] font-bold text-gray-600">No messages yet</p>
                  <p className="text-[10px] text-gray-400 mt-1">Start the conversation!</p>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isSelf = msg.isSelf;
              const isVoiceMessage = msg.image && msg.image.startsWith('data:audio');
              const isPlayingThisMessage = playingVoiceMessageId === msg.id;

              if (msg.isArchived && !revealArchivedMessages) {
                return (
                  <div key={msg.id} className="flex self-center my-0.5">
                    <button onClick={() => setRevealArchivedMessages(true)}
                      className="text-[8.5px] bg-amber-50/20 border border-amber-100 text-amber-600/70 py-1 px-3 rounded-full hover:bg-amber-50 flex items-center gap-1.5">
                      <Archive className="w-2.5 h-2.5" />
                      <span>Archived message (click to reveal)</span>
                    </button>
                  </div>
                );
              }

              return (
                <div key={msg.id} id={`msg-block-${msg.id}`}
                  className={`flex gap-3 max-w-[85%] ${isSelf ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  
                  {!isSelf && (
                    <div className="shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-full bg-teal-500 text-white font-bold text-[9px] flex items-center justify-center">
                        {msg.senderName?.charAt(0) || 'U'}
                      </div>
                    </div>
                  )}

                  <div className={`flex flex-col relative ${isSelf ? 'items-end' : 'items-start'}`}>
                    
                    {/* Timestamp & Read Receipts */}
                    <div className="text-[9px] font-semibold mb-1 select-none px-1 flex items-center gap-1.5">
                      {isSelf ? (
                        <>
                          <span className="text-[#8e9cae]">{`You, ${msg.time}`}</span>
                          <span className="inline-flex items-center shrink-0 ml-1">
                            {msg.receiptStatus === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-[#00c5bc]" title="Read by recipient" />
                            ) : msg.receiptStatus === 'delivered' ? (
                              <CheckCheck className="w-3 h-3 text-gray-400" title="Delivered" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-400" title="Sent" />
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#8e9cae]">{`${msg.senderName}, ${msg.time}`}</span>
                          {msg.isRead === false && (
                            <span className="bg-[#ef4444] text-white font-black text-[7px] uppercase px-1 py-px rounded-sm animate-pulse tracking-wide select-none" title="Unread message">
                              New
                            </span>
                          )}
                          {msg.isRead === true && (
                            <span className="text-[#00c5bc] text-[8px] font-bold" title="Read">
                              Read ✓✓
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Message Content */}
                    <button
                      onClick={() => setFocusedMessageId(focusedMessageId === msg.id ? null : msg.id)}
                      className={`p-1 rounded-[15px] text-left transition-all ${
                        isSelf 
                          ? 'bg-[#d2e2f3] text-[#2c3d52] rounded-tr-none hover:bg-[#c3d7ec]' 
                          : 'bg-white text-[#2c3e50] rounded-tl-none hover:bg-gray-50'
                      }`}>
                      
                      {isVoiceMessage ? (
                        <div className="px-3 py-2 flex items-center gap-3 min-w-[160px] max-w-[280px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.image) {
                                toggleVoiceMessagePlayback(msg.id, msg.image);
                              }
                            }}
                            className="w-9 h-9 rounded-full bg-[#00c5bc] text-white flex items-center justify-center hover:bg-[#00b0a8] transition-colors shrink-0"
                          >
                            {isPlayingThisMessage ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-[60px]">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#00c5bc] rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${voiceMessageProgress[msg.id] || 0}%`,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-gray-400">
                                {formatDuration(voiceMessageDuration[msg.id] || 0)}
                              </span>
                              <span className="text-[8px] text-gray-300">🎤 Voice</span>
                            </div>
                          </div>
                          
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        </div>
                      ) : msg.image && (
                        <div className="rounded-[11px] overflow-hidden max-w-[280px]">
                          <img src={msg.image} alt="Attached" className="w-full h-auto max-h-[220px]" />
                        </div>
                      )}
                      
                      {msg.text && (
                        <div className="px-3 py-1.5 text-[11px] font-medium break-words">
                          {msg.text}
                        </div>
                      )}
                    </button>

                    {/* Message Context Menu */}
                    {focusedMessageId === msg.id && (
                      <div className="absolute top-full mt-1.5 bg-white border border-gray-150 rounded-2xl shadow-xl p-1.5 z-45 w-48">
                        <div className="text-[8px] font-black text-gray-400 px-2.5 py-1 border-b border-gray-100 flex justify-between">
                          <span>Message options</span>
                          <button onClick={() => setFocusedMessageId(null)}><X className="w-3 h-3" /></button>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          <button onClick={() => { onUpdateMessage?.(chat.id, msg.id, { isStarred: !msg.isStarred }); setFocusedMessageId(null); }}
                            className="w-full text-left px-2.5 py-1 text-[9.5px] hover:bg-[#e4f8f7]/40 rounded-lg flex items-center gap-1.5">
                            <Star className={`w-3 h-3 text-amber-500 ${msg.isStarred ? 'fill-amber-500' : ''}`} />
                            <span>{msg.isStarred ? 'Unstar' : 'Star'}</span>
                          </button>
                          <button onClick={() => { onUpdateMessage?.(chat.id, msg.id, { isPinned: !msg.isPinned }); setFocusedMessageId(null); }}
                            className="w-full text-left px-2.5 py-1 text-[9.5px] hover:bg-[#e4f8f7]/40 rounded-lg flex items-center gap-1.5">
                            <Pin className="w-3 h-3 text-[#00c5bc] rotate-45" />
                            <span>{msg.isPinned ? 'Unpin' : 'Pin'}</span>
                          </button>
                          <button onClick={() => { onUpdateMessage?.(chat.id, msg.id, { isArchived: !msg.isArchived }); setFocusedMessageId(null); }}
                            className="w-full text-left px-2.5 py-1 text-[9.5px] hover:bg-[#e4f8f7]/40 rounded-lg flex items-center gap-1.5">
                            <Archive className="w-3 h-3 text-amber-600" />
                            <span>{msg.isArchived ? 'Unarchive' : 'Archive'}</span>
                          </button>
                          <button onClick={() => { onDeleteMessage?.(chat.id, msg.id); setFocusedMessageId(null); }}
                            className="w-full text-left px-2.5 py-1 text-[9.5px] hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5">
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </>
        ) : (
          /* Participants Tab */
          <div className="space-y-3 py-1">
            <div className="p-3 bg-white/70 rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-[#00c5bc]" />
              <p className="text-[10px] text-[#556578] font-medium">
                Private conversation between you and {chat.name}
              </p>
            </div>
            
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">
              Participants
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="bg-white p-3 rounded-xl flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-3">
                  {chat.avatar ? (
                    <img src={chat.avatar} alt={chat.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-[#00c5bc] font-bold text-[10px] flex items-center justify-center">
                      {chat.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-[10.5px] font-bold text-gray-800">{chat.name}</h4>
                    <p className="text-[9.5px] text-gray-400 font-medium">User</p>
                  </div>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${chat.statusText === 'Online' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>
                  {chat.statusText === 'Online' ? 'Active' : 'Offline'}
                </span>
              </div>
            </div>
            
            {onResetChat && (
              <div className="pt-4 border-t border-[#e2e8f0]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => onResetChat(chat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-[10px] font-bold text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset Chat Logs
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      {activeTab === 'messages' && (
        <form onSubmit={handleSend} className="p-4 bg-[#f1f4f8] border-t border-[#e5e9f0]/60 flex flex-col gap-2.5 shrink-0">
          
          {/* Pending Image Preview */}
          {pendingImage && (
            <div className="w-full bg-white rounded-xl p-2.5 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden border">
                  <img src={pendingImage} alt="Pending" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-700">Image selected</p>
                  <p className="text-[8px] text-gray-400">Ready to send</p>
                </div>
              </div>
              <button type="button" onClick={() => setPendingImage(null)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Voice Recording Interface */}
          {showRecordingInterface && audioUrl && (
            <div className="w-full bg-white rounded-xl p-3 border border-[#00c5bc]/30 shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="w-10 h-10 rounded-full bg-[#00c5bc] text-white flex items-center justify-center hover:bg-[#00b0a8] transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00c5bc] rounded-full transition-all duration-300"
                        style={{ width: `${playbackProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 min-w-[40px]">
                      {formatTime(recordingDuration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-gray-400">🎤 Voice message</span>
                    <span className="text-[8px] text-gray-300">•</span>
                    <span className="text-[8px] text-gray-400">{formatTime(recordingDuration)}</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={discardRecording}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Discard recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="w-full bg-white rounded-xl shadow-xs border border-gray-100 flex items-center px-4 py-2 gap-3">
            
            <input
              type="text"
              placeholder={pendingImage ? "Add a caption..." : audioBlob ? "Add a caption to your voice message..." : "Write a message..."}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleTyping();
              }}
              className="flex-1 bg-transparent border-none text-[11px] font-medium text-[#2c3d52] outline-none"
            />

            <input type="file" ref={attachmentInputRef} onChange={handleLocalImageUpload} accept="image/*" className="hidden" />

            <div className="flex items-center gap-2">
              {/* Voice Recording Button */}
              {!isRecording && !audioBlob ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="hover:text-[#00c5bc] px-1.5 py-1 transition-colors"
                  title="Record voice message"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : isRecording && (
                <div className="flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-bold text-red-500">REC</span>
                    <span className="text-[9px] font-mono text-gray-600">{formatTime(recordingDuration)}</span>
                  </div>
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeRecording}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Resume recording"
                    >
                      <Play className="w-3 h-3 text-gray-600" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseRecording}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Pause recording"
                    >
                      <Pause className="w-3 h-3 text-gray-600" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Stop recording"
                  >
                    <StopCircle className="w-3 h-3 text-red-500" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Cancel recording"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}

              {/* Attachment Button */}
              <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
                <button type="button" onClick={() => { attachmentInputRef.current?.click(); setShowEmojiPicker(false); }}
                  className="hover:text-[#00c5bc] px-1.5 py-1">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setShowAttachmentMenu(!showAttachmentMenu); setShowEmojiPicker(false); }}
                  className={`px-1 text-[8px] ${showAttachmentMenu ? 'text-[#00c5bc]' : 'text-gray-400'}`}>
                  ▼
                </button>
              </div>

              <button type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachmentMenu(false); }}
                className={`hover:text-gray-600 ${showEmojiPicker ? 'text-[#00c5bc]' : ''}`}>
                <Smile className="w-4 h-4" />
              </button>

              <button type="submit" disabled={!inputText.trim() && !pendingImage && !audioBlob}
                className="w-7 h-7 rounded-md bg-[#00c5bc] hover:bg-[#00b0a8] flex items-center justify-center text-white disabled:opacity-50 transition-colors">
                <Send className="w-3.5 h-3.5 fill-white" />
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute right-0 bottom-14 bg-white border rounded-2xl shadow-2xl z-50 w-[330px] overflow-hidden">
                <div className="flex justify-between px-3.5 py-2.5 border-b bg-gray-50/50">
                  <span className="text-[9.5px] font-black text-gray-500">Quick Emojis</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-[9px] font-bold text-gray-400">Close</button>
                </div>
                <div className="p-3 bg-[#e4f8f7]/30 border-b">
                  <div className="flex flex-wrap gap-1.5">
                    {["❤️", "😂", "👍", "🔥", "🎉", "😍", "🙌", "👏", "✨", "💯", "🏠", "🔑"].map((em) => (
                      <button key={em} onClick={() => setInputText(prev => prev + em)}
                        className="w-7 h-7 text-base flex items-center justify-center hover:bg-white rounded-md">
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-full h-[270px]">
                  <EmojiPicker onEmojiClick={(data) => setInputText(prev => prev + data.emoji)} theme={Theme.LIGHT} />
                </div>
              </div>
            )}

            {/* Attachment Menu */}
            {showAttachmentMenu && (
              <div ref={attachmentMenuRef} className="absolute right-12 bottom-12 bg-white border rounded-xl shadow-xl p-3 z-40 w-64">
                <div className="flex justify-between pb-1 border-b">
                  <span className="text-[9px] font-extrabold text-gray-400">Attach Photos</span>
                  <button onClick={() => setShowAttachmentMenu(false)} className="text-[8px]">Close</button>
                </div>
                <div className="mt-2">
                  <label className="flex flex-col items-center border border-dashed rounded-lg py-2.5 cursor-pointer hover:border-[#00c5bc]">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-[9px] text-gray-500">Select picture</span>
                    <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
                  </label>
                </div>
                <div className="mt-2">
                  <p className="text-[8px] font-bold text-gray-400">Property Presets</p>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {PROPERTY_PRESETS.map((preset, idx) => (
                      <button key={idx} onClick={() => { setPendingImage(preset.url); setShowAttachmentMenu(false); }}
                        className="h-10 rounded-lg overflow-hidden border hover:border-[#00c5bc]">
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 pt-1.5 border-t">
                  <div className="flex gap-1">
                    <input type="url" placeholder="Photo URL" value={customImageUrl} onChange={(e) => setCustomImageUrl(e.target.value)}
                      className="flex-1 bg-gray-50 border rounded-lg px-2 py-1 text-[8.5px]" />
                    <button onClick={() => { if (customImageUrl) { setPendingImage(customImageUrl); setCustomImageUrl(''); setShowAttachmentMenu(false); } }}
                      className="bg-[#00c5bc] text-white px-2 py-1 rounded-lg text-[8.5px]">Set</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}