import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Search, Plus, MoreVertical, FolderOpen, Archive, Zap, Check, CheckCheck, VolumeX, Volume2, Trash2, X, UserPlus } from 'lucide-react';
import { Chat } from '../types';
import { searchUsers, createOrGetChat } from '../services/chatService';
import { auth, db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

interface ChatListSidebarProps {
  chats: Chat[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddChat?: () => void;
  currentUser: { name: string; avatar: string; status: string };
  onChangeAvatar: (url: string) => void;
  onGlobalChatAction?: (action: 'mark-all-read' | 'mute-all' | 'unmute-all' | 'archive-all' | 'clear-all') => void;
  onAddChatWithUser?: (user: { name: string; avatar: string; role: string; uid: string }) => void;
  onUpdateChatStatus?: (chatId: string, updates: Partial<Chat>) => void;
  onChatCreated?: (chatId: string) => void;
}

export default function ChatListSidebar({
  chats,
  selectedChatId,
  onSelectChat,
  searchQuery,
  setSearchQuery,
  onAddChat,
  currentUser,
  onChangeAvatar,
  onGlobalChatAction,
  onAddChatWithUser,
  onUpdateChatStatus,
  onChatCreated
}: ChatListSidebarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [searchUsersQuery, setSearchUsersQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Save avatar to Firebase with improved error handling
  const saveAvatarToFirebase = async (avatarUrl: string) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found');
      alert('Please login again to save your profile image.');
      return false;
    }

    try {
      setIsUploading(true);
      console.log("💾 Saving avatar to Firebase:", avatarUrl);
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        avatar: avatarUrl,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Avatar saved to Firebase successfully');
      return true;
    } catch (error) {
      console.error('Error saving avatar to Firebase:', error);
      alert('Failed to save profile image. Please try again.');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB. Please choose a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        const avatarUrl = event.target.result;
        // Update local state first for immediate feedback
        onChangeAvatar(avatarUrl);
        // Save to Firebase
        await saveAvatarToFirebase(avatarUrl);
      }
    };
    reader.onerror = () => {
      alert('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePresetAvatarSelect = async (url: string) => {
    // Update local state first
    onChangeAvatar(url);
    // Save to Firebase
    await saveAvatarToFirebase(url);
    setShowPicker(false);
  };

  const handleCustomUrlSubmit = async () => {
    if (!customUrl.trim()) {
      alert('Please enter a valid URL');
      return;
    }

    // Validate URL
    try {
      new URL(customUrl.trim());
    } catch {
      alert('Please enter a valid URL (e.g., https://example.com/image.jpg)');
      return;
    }

    // Update local state first
    onChangeAvatar(customUrl.trim());
    // Save to Firebase
    await saveAvatarToFirebase(customUrl.trim());
    setCustomUrl('');
    setShowPicker(false);
  };

  // Search for users when typing
  useEffect(() => {
    const searchUsersDebounced = async () => {
      if (searchUsersQuery.trim().length > 0) {
        setIsSearching(true);
        console.log("🔍 Searching for:", searchUsersQuery);
        const results = await searchUsers(searchUsersQuery);
        console.log("📋 Search results:", results);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    };
    
    const timeoutId = setTimeout(searchUsersDebounced, 500);
    return () => clearTimeout(timeoutId);
  }, [searchUsersQuery]);

  const handleStartChat = async (user: any) => {
    try {
      console.log("💬 Starting chat with:", user.name, user.uid);
      const chatId = await createOrGetChat(user.uid);
      console.log("✅ Chat created with ID:", chatId);
      if (onChatCreated) {
        onChatCreated(chatId);
      }
      onSelectChat(chatId);
      setShowAddUserModal(false);
      setSearchUsersQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    }
  };

  const PRESET_AVATARS = [
    { name: "Original (Default)", url: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg" },
    { name: "Executive Suit", url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80" },
    { name: "Tech Enthusiast", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80" },
    { name: "Design Director", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80" },
    { name: "Consultant Expert", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" }
  ];

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchive = showArchivedOnly ? !!chat.isArchived : !chat.isArchived;
    return matchesSearch && matchesArchive;
  });

  return (
    <div id="chat-sidebar" className="w-[280px] min-w-[280px] h-full bg-[#fcfdfe] border-r border-[#f1f3f6] flex flex-col pt-5 pb-4 select-none">
      
      <div className="px-5 flex items-center gap-3 mb-5">
        <button className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <h1 className="text-sm font-bold text-[#1a2530] tracking-wide">Chat</h1>
      </div>

      {/* Profile Card */}
      <div className="px-5 mb-5 relative">
        <div className="bg-[#fcfdfe] border border-[#eef2f6] py-4 rounded-2xl flex flex-col items-center justify-center shadow-xs hover:border-[#11b5ac]/40 transition-colors">
          
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative mb-2 cursor-pointer group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="w-[58px] h-[58px] rounded-full p-[3px] border border-gray-200 flex items-center justify-center group-hover:border-[#00c5bc] transition-all">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover group-hover:opacity-85 transition-opacity"
              />
            </div>
            <span className="absolute bottom-[2px] right-[2px] block h-3 w-3 rounded-full ring-2 ring-white bg-[#00c5bc]" />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-[3px]">
              <span className="text-[10px] text-white font-extrabold tracking-tight text-center">
                {isUploading ? 'SAVING...' : 'UPLOAD'}
              </span>
            </div>
          </div>

          <h2 className="text-[11px] font-bold text-[#1a2c3a]">{currentUser.name}</h2>
          
          <div className="mt-1.5 flex items-center gap-1.5">
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`px-3 py-0.5 bg-[#e4f8f7] text-[#00c5bc] rounded-full cursor-pointer hover:bg-[#d6f4f2] transition-colors flex items-center gap-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span className="text-[10px] font-bold tracking-wide">
                {isUploading ? 'Saving...' : 'Upload Photo'}
              </span>
            </div>
            <div 
              onClick={() => setShowPicker(!showPicker)}
              className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full cursor-pointer transition-colors"
            >
              <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
            </div>
          </div>

          {showPicker && (
            <div className="absolute left-2.5 right-2.5 top-[10px] bg-white border border-gray-100 shadow-xl rounded-2xl p-3 z-30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-700">Choose Profile Image</span>
                <button onClick={() => setShowPicker(false)} className="text-[9px] font-bold text-gray-400 hover:text-gray-600">Close</button>
              </div>
              <div className="flex gap-2 justify-center mb-2.5 py-1">
                {PRESET_AVATARS.map((preset, index) => {
                  const isSelected = currentUser.avatar === preset.url;
                  return (
                    <button key={index} onClick={() => handlePresetAvatarSelect(preset.url)}
                      className={`w-8 h-8 rounded-full p-[2px] border transition-all ${isSelected ? 'border-[#00c5bc] ring-2 ring-[#00c5bc]/10 scale-105' : 'border-gray-200 hover:border-[#00c5bc]'}`}>
                      <img src={preset.url} alt={preset.name} className="w-full h-full rounded-full object-cover" />
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-gray-100 pt-2">
                <p className="text-[8px] font-semibold text-gray-400 mb-1">OR ENTER CUSTOM URL</p>
                <div className="flex gap-1.5">
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/..." 
                    value={customUrl} 
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[9px] outline-none text-gray-700" 
                  />
                  <button 
                    onClick={handleCustomUrlSubmit}
                    disabled={isUploading}
                    className="bg-[#00c5bc] text-white px-2 py-1 rounded-lg text-[9px] font-bold hover:bg-[#00b0a8] disabled:opacity-50"
                  >
                    {isUploading ? 'Saving...' : 'Set'}
                  </button>
                </div>
              </div>
              {isUploading && (
                <div className="mt-2 text-center">
                  <span className="text-[8px] text-gray-400">Saving to database...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="px-5 mb-5">
        <div className="relative flex items-center bg-[#f0f4f8] rounded-xl px-3 py-1.5">
          <input 
            type="text" 
            placeholder="Search chats..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-[10.5px] outline-none text-gray-700 placeholder-gray-400 font-medium pb-px" 
          />
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 pointer-events-none" />
        </div>
      </div>

      {/* Chats Header */}
      <div className="px-5 flex flex-col gap-2 mb-2.5 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-black text-[#9aa6b7] tracking-wider">
              {showArchivedOnly ? 'Archived Chats' : 'Last chats'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c5bc]"></span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowArchivedOnly(!showArchivedOnly)}
              className={`text-[8.5px] font-black px-2 py-0.5 rounded-md transition-all border flex items-center gap-1 ${showArchivedOnly ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-gray-50 border-gray-150 text-gray-500 hover:text-[#00c5bc]'}`}>
              {showArchivedOnly ? <><FolderOpen className="w-2.5 h-2.5" /><span>Box</span></> : <><Archive className="w-2.5 h-2.5" /><span>Archive</span></>}
            </button>
            <button onClick={() => setShowAddUserModal(true)}
              className="w-5.5 h-5.5 rounded-full bg-[#e4f8f7] text-[#00c5bc] hover:bg-[#d6f4f2] flex items-center justify-center transition-all">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button onClick={() => setShowSectionMenu(!showSectionMenu)}
              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${showSectionMenu ? 'bg-gray-100 text-[#00c5bc]' : 'text-gray-400 hover:text-gray-600'}`}>
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="absolute left-4 right-4 top-7 bg-white border border-gray-150 shadow-2xl rounded-2xl p-4.5 z-50 flex flex-col max-h-[450px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100">
              <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#00c5bc] rounded-full"></span> Start new chat
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-[8.5px] bg-gray-50 border border-gray-150 text-gray-600 font-black px-2 py-1 rounded-md">
                <X className="w-3 h-3 inline mr-1" />Close
              </button>
            </div>
            
            {/* Search Users Input */}
            <div className="mb-3">
              <input 
                type="text" 
                placeholder="Search by name (e.g., Debbie, KC)..." 
                value={searchUsersQuery} 
                onChange={(e) => setSearchUsersQuery(e.target.value)}
                className="w-full text-[10px] border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#00c5bc] focus:ring-1 focus:ring-[#00c5bc]" 
                autoFocus
              />
            </div>
            
            <div className="flex-1 space-y-1.5 pr-1">
              {isSearching ? (
                <div className="text-center py-4">
                  <div className="w-5 h-5 border-2 border-[#00c5bc] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[9px] text-gray-400 mt-2">Searching for users...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-gray-50/80 rounded-xl transition-all border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[10.5px] font-extrabold text-gray-800 truncate">{user.name}</p>
                        <p className="text-[8px] text-[#00c5bc] font-bold">{user.role || 'User'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleStartChat(user)}
                      className="bg-[#00c5bc] text-white text-[9.5px] font-black px-3 py-1 rounded-md hover:bg-[#00b0a8] transition-colors shadow-sm"
                    >
                      + Chat
                    </button>
                  </div>
                ))
              ) : searchUsersQuery ? (
                <div className="text-center py-8">
                  <p className="text-[9px] text-gray-400">No users found matching "{searchUsersQuery}"</p>
                  <p className="text-[8px] text-gray-300 mt-1">Try searching for "Debbie" or "KC"</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-[9px] text-gray-400">Type a name to search for users</p>
                  <p className="text-[8px] text-gray-300 mt-1">Try: Debbie, KC</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Menu */}
        {showSectionMenu && (
          <div className="absolute right-5 top-7 bg-white border border-gray-150 rounded-2xl shadow-xl p-1.5 z-40 w-48">
            <button onClick={() => { if (onGlobalChatAction) onGlobalChatAction('mark-all-read'); setShowSectionMenu(false); }}
              className="w-full text-left px-2.5 py-2 text-[10px] text-gray-700 hover:bg-[#e4f8f7]/40 hover:text-[#00c5bc] font-bold rounded-lg flex items-center justify-between">
              <span>Mark all as read</span> <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button onClick={() => { if (onGlobalChatAction) onGlobalChatAction('mute-all'); setShowSectionMenu(false); }}
              className="w-full text-left px-2.5 py-2 text-[10px] text-gray-700 hover:bg-[#e4f8f7]/40 hover:text-[#00c5bc] font-bold rounded-lg flex items-center justify-between">
              <span>Mute all chats</span> <VolumeX className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button onClick={() => { if (onGlobalChatAction) onGlobalChatAction('unmute-all'); setShowSectionMenu(false); }}
              className="w-full text-left px-2.5 py-2 text-[10px] text-gray-700 hover:bg-[#e4f8f7]/40 hover:text-[#00c5bc] font-bold rounded-lg flex items-center justify-between">
              <span>Unmute all chats</span> <Volume2 className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            const lastMsg = chat.messages?.[chat.messages.length - 1];
            
            return (
              <button key={chat.id} onClick={() => onSelectChat(chat.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left ${isSelected ? 'bg-[#f4f7fa] border-l-[3px] border-[#00c5bc]' : 'hover:bg-gray-50/70 border-l-[3px] border-transparent'}`}>
                <div className="relative shrink-0">
                  {chat.avatar ? (
                    <img src={chat.avatar} alt={chat.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${chat.avatarColor || 'bg-[#00c5bc] text-white'}`}>
                      {chat.avatarInitials || chat.name?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] truncate font-bold text-[#1a2c3a]">{chat.name}</span>
                    <span className="text-[8.5px] text-gray-400">{lastMsg?.time || ''}</span>
                  </div>
                  <p className="text-[10px] mt-0.5 truncate text-gray-500">
                    {lastMsg ? (lastMsg.isSelf ? `You: ${lastMsg.text}` : lastMsg.text) : chat.statusText || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-[10px] text-gray-400">No chats yet</div>
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="mt-2 text-[9px] text-[#00c5bc] font-bold hover:underline"
            >
              Start a new conversation →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}