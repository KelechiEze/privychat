import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Clock, Mail, ArrowRight, MessageSquare, Shield, Check, Phone,
  TrendingUp, Home, Key, Activity, Sparkles, Plus, AlertCircle, RefreshCw
} from 'lucide-react';
import NavigationRail from './components/NavigationRail';
import ChatListSidebar from './components/ChatListSidebar';
import GroupChatWorkspace from './components/GroupChatWorkspace';
import SharedFilesPanel from './components/SharedFilesPanel';
import Preloader from './components/Preloader';
import LoginPage from './components/LoginPage';
import { Chat, Message } from './types';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { 
  listenToUserChats, 
  listenToMessages, 
  sendMessage as sendFirebaseMessage,
  updateMessage as updateFirebaseMessage,
  deleteMessage as deleteFirebaseMessage,
  setUserOnline,
  updateUserProfile,
  getCurrentUserProfile,
  markAllMessagesAsRead,
  listenToUserStatus
} from './services/chatService';
import { db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showPreloader, setShowPreloader] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  
  const [currentUser, setCurrentUser] = useState({
    name: "",
    status: "available",
    avatar: "",
  });

  const [mobileActivePanel, setMobileActivePanel] = useState<'sidebar' | 'chat' | 'details'>('chat');

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
  };

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      if (user) {
        setFirebaseUser(user);
        
        try {
          // First try to get saved profile from Firestore
          const savedProfile = await getCurrentUserProfile();
          console.log("📥 Loaded profile from Firestore:", savedProfile);
          
          // Use saved profile data if available, otherwise fallback to auth data
          const displayName = savedProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'User';
          
          // CRITICAL: Load avatar from Firestore first
          let photoURL = savedProfile?.avatar;
          
          // If no avatar in Firestore, try Auth photoURL (but only if it's a URL, not base64)
          if (!photoURL && user.photoURL) {
            try {
              new URL(user.photoURL);
              photoURL = user.photoURL;
            } catch {
              photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00c5bc&color=fff`;
            }
          }
          
          if (!photoURL) {
            photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00c5bc&color=fff`;
          }
          
          console.log("🖼️ Setting avatar to:", photoURL);
          
          setCurrentUser({
            name: displayName,
            status: savedProfile?.status || "available",
            avatar: photoURL,
          });
          
          setIsLoggedIn(true);
        } catch (error) {
          console.error("Error loading user profile:", error);
          const displayName = user.displayName || user.email?.split('@')[0] || 'User';
          setCurrentUser({
            name: displayName,
            status: "available",
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00c5bc&color=fff`,
          });
          setIsLoggedIn(true);
        }
      } else {
        setFirebaseUser(null);
        setIsLoggedIn(false);
        setChats([]);
        setSelectedChatId('');
      }
      setAuthChecked(true);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Set online status when user logs in/out
  useEffect(() => {
    if (firebaseUser) {
      setUserOnline(firebaseUser.uid, true);
      
      const handleBeforeUnload = () => {
        setUserOnline(firebaseUser.uid, false);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Also handle page visibility change (user switching tabs)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setUserOnline(firebaseUser.uid, false);
        } else {
          setUserOnline(firebaseUser.uid, true);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        setUserOnline(firebaseUser.uid, false);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [firebaseUser]);

  // Load user's chats when logged in
  useEffect(() => {
    if (firebaseUser && isLoggedIn) {
      console.log("Loading chats for user:", firebaseUser.uid);
      const unsubscribe = listenToUserChats((userChats) => {
        console.log("Chats loaded:", userChats.length);
        setChats(userChats as Chat[]);
        if (userChats.length > 0 && !selectedChatId) {
          setSelectedChatId(userChats[0].id);
        }
      });
      return () => unsubscribe();
    }
  }, [firebaseUser, isLoggedIn]);

  // Load messages for selected chat
  useEffect(() => {
    if (selectedChatId && firebaseUser) {
      console.log("Loading messages for chat:", selectedChatId);
      const unsubscribe = listenToMessages(selectedChatId, (messages) => {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === selectedChatId 
              ? { ...chat, messages: messages }
              : chat
          )
        );
      });
      return () => unsubscribe();
    }
  }, [selectedChatId, firebaseUser]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (selectedChatId && firebaseUser) {
      markAllMessagesAsRead(selectedChatId);
    }
  }, [selectedChatId, firebaseUser]);

  const handleLoginSuccess = (enteredName: string, userData: any) => {
    const avatarUrl = userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(enteredName)}&background=00c5bc&color=fff`;
    
    if (auth.currentUser) {
      try {
        new URL(avatarUrl);
        updateProfile(auth.currentUser, {
          displayName: enteredName,
          photoURL: avatarUrl
        }).catch(console.error);
      } catch {
        updateProfile(auth.currentUser, {
          displayName: enteredName
        }).catch(console.error);
      }
      
      if (firebaseUser) {
        updateUserProfile(firebaseUser.uid, { 
          displayName: enteredName, 
          avatar: avatarUrl,
          status: "available"
        }).catch(console.error);
      }
    }
    
    setCurrentUser({
      name: enteredName,
      status: "available",
      avatar: avatarUrl
    });
  };

  const handleLogout = async () => {
    try {
      if (firebaseUser) {
        await setUserOnline(firebaseUser.uid, false);
      }
      await signOut(auth);
      setIsLoggedIn(false);
      setChats([]);
      setSelectedChatId('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleChangeAvatar = async (newUrl: string) => {
    if (!firebaseUser) {
      console.error("No user logged in");
      return;
    }

    try {
      setIsSavingAvatar(true);
      console.log("🔄 Changing avatar to:", newUrl.substring(0, 100) + "...");
      
      setCurrentUser(prev => ({ ...prev, avatar: newUrl }));
      
      await updateUserProfile(firebaseUser.uid, { 
        avatar: newUrl,
        updatedAt: new Date().toISOString()
      });
      console.log("✅ Avatar saved to Firestore database!");
      
      try {
        new URL(newUrl);
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { 
            photoURL: newUrl 
          });
          console.log("✅ Auth profile updated with URL");
        }
      } catch {
        console.log("ℹ️ Avatar is base64, skipping Auth update");
      }
      
      const savedProfile = await getCurrentUserProfile();
      console.log("🔍 Verified saved profile:", savedProfile?.avatar ? "Avatar present" : "No avatar");
      
    } catch (error) {
      console.error("❌ Error saving avatar:", error);
      alert("Failed to save profile image. Please try again.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMobileActivePanel('chat');
  };

  const handleSendMessage = async (chatId: string, text: string, imageUrl?: string) => {
    try {
      await sendFirebaseMessage(chatId, text, imageUrl);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleUpdateMessage = async (chatId: string, messageId: string, updates: Partial<Message>) => {
    try {
      await updateFirebaseMessage(chatId, messageId, updates);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleDeleteMessage = async (chatId: string, messageId: string) => {
    try {
      await deleteFirebaseMessage(chatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleResetChat = (chatId: string) => {
    console.log("Reset chat:", chatId);
  };

  const handleUpdateChatStatus = (chatId: string, updates: Partial<Chat>) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId ? { ...chat, ...updates } : chat
      )
    );
  };

  const handleGlobalChatAction = (action: 'mark-all-read' | 'mute-all' | 'unmute-all' | 'archive-all' | 'clear-all') => {
    setChats(prevChats => 
      prevChats.map(chat => {
        switch (action) {
          case 'mark-all-read':
            return { ...chat, unreadCount: 0 };
          case 'mute-all':
            return { ...chat, isMuted: true };
          case 'unmute-all':
            return { ...chat, isMuted: false };
          case 'archive-all':
            return { ...chat, isArchived: true };
          case 'clear-all':
            return { ...chat, messages: [] };
          default:
            return chat;
        }
      })
    );
  };

  const handleAddChatWithUser = async (user: { name: string; avatar: string; role: string; uid?: string }) => {
    if (user.uid) {
      const { createOrGetChat } = await import('./services/chatService');
      const chatId = await createOrGetChat(user.uid);
      setSelectedChatId(chatId);
      setMobileActivePanel('chat');
    } else {
      alert(`User ${user.name} needs to have an account first.`);
    }
  };

  const handleAddChat = () => {
    const channelName = prompt("Enter new channel name:");
    if (!channelName || !channelName.trim()) return;
    alert("Group chat creation coming soon!");
  };

  const handleChatCreated = (chatId: string) => {
    console.log("New chat created with ID:", chatId);
    setSelectedChatId(chatId);
  };

  const currentChat = chats.find(c => c.id === selectedChatId) || null;

  if (showPreloader) {
    return <Preloader onComplete={handlePreloaderComplete} />;
  }

  if (isLoading || !authChecked) {
    return (
      <div className="w-screen h-screen bg-[#eaedf1] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#00c5bc] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Initializing secure workspace...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div id="app-root" className="w-screen h-screen bg-[#eaedf1] flex items-center justify-center font-sans antialiased text-gray-800 overflow-hidden md:p-5 lg:p-10">
        <div className="w-full h-full max-w-7xl max-h-[850px] bg-white rounded-none md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/40">
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div id="app-root" className="w-screen h-screen bg-[#eaedf1] flex items-center justify-center font-sans antialiased text-gray-800 overflow-hidden md:p-5 lg:p-10">
      
      <div className="w-full h-full max-w-7xl max-h-[850px] bg-white rounded-none md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/40">
        
        {/* Mobile Header */}
        <div className="md:hidden h-12 bg-[#fcfdfe] px-4 border-b border-[#f1f3f6] flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00c5bc] rounded-full" />
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">{activeTab}</span>
          </div>
          
          {activeTab === 'chats' && (
            <div className="flex gap-1 bg-[#e8ecf2] p-0.5 rounded-lg">
              <button 
                onClick={() => setMobileActivePanel('sidebar')}
                className={`px-2 py-1 text-[9px] font-bold rounded-md ${mobileActivePanel === 'sidebar' ? 'bg-[#00c5bc] text-white' : 'text-gray-500'}`}
              >
                Inboxes
              </button>
              
              <button 
                onClick={() => setMobileActivePanel('chat')}
                className={`px-2 py-1 text-[9px] font-bold rounded-md ${mobileActivePanel === 'chat' ? 'bg-[#00c5bc] text-white' : 'text-gray-500'}`}
              >
                Chat
              </button>

              <button 
                onClick={() => setMobileActivePanel('details')}
                className={`px-2 py-1 text-[9px] font-bold rounded-md ${mobileActivePanel === 'details' ? 'bg-[#00c5bc] text-white' : 'text-gray-500'}`}
              >
                Files
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Navigation Rail - Desktop */}
          <div className="hidden sm:block">
            <NavigationRail 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              currentUser={currentUser} 
              onChangeAvatar={handleChangeAvatar} 
              onLogout={handleLogout} 
            />
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'chats' ? (
              <>
                {/* Chat List Sidebar */}
                <div className={`
                  ${mobileActivePanel === 'sidebar' ? 'block w-full' : 'hidden'} 
                  md:block md:w-72 border-r border-[#f1f3f6] shrink-0 h-full
                `}>
                  <ChatListSidebar 
                    chats={chats}
                    selectedChatId={selectedChatId}
                    onSelectChat={handleSelectChat}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onAddChat={handleAddChat}
                    currentUser={currentUser}
                    onChangeAvatar={handleChangeAvatar}
                    onGlobalChatAction={handleGlobalChatAction}
                    onAddChatWithUser={handleAddChatWithUser}
                    onUpdateChatStatus={handleUpdateChatStatus}
                    onChatCreated={handleChatCreated}
                  />
                </div>

                {/* Chat Workspace */}
                <div className={`
                  ${mobileActivePanel === 'chat' ? 'block w-full' : 'hidden'} 
                  md:block flex-1 h-full
                `}>
                  {currentChat ? (
                    <GroupChatWorkspace 
                      chat={currentChat}
                      onSendMessage={handleSendMessage}
                      onResetChat={handleResetChat}
                      onUpdateMessage={handleUpdateMessage}
                      onDeleteMessage={handleDeleteMessage}
                      onUpdateChatStatus={handleUpdateChatStatus}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Select a chat to start messaging</p>
                        <button 
                          onClick={() => {
                            const addButton = document.querySelector('[title="Add a colleague from available users in site"]') as HTMLElement;
                            if (addButton) addButton.click();
                          }}
                          className="mt-4 text-[#00c5bc] text-xs font-bold hover:underline"
                        >
                          Start a new conversation →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shared Files Panel */}
                <div className={`
                  ${mobileActivePanel === 'details' ? 'block w-full' : 'hidden'} 
                  lg:block lg:w-[300px] shrink-0 h-full
                `}>
                  {currentChat && <SharedFilesPanel chat={currentChat} />}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-auto p-6 bg-[#f8fafc]">
                <div className="text-center py-20">
                  <p className="text-gray-400">Coming soon...</p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}