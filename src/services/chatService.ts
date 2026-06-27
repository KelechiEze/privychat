import { db, auth } from '../firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  limit,
  increment,
  Unsubscribe
} from 'firebase/firestore';

// Helper to create consistent chat ID between two users
export const getChatId = (userId1: string, userId2: string) => {
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

// Get current authenticated user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Default shared files structure
const DEFAULT_SHARED_FILES = [
  { 
    type: 'Documents', 
    filesCount: 0, 
    totalSize: '0MB', 
    colorClass: 'bg-purple-100 text-purple-600', 
    items: [] 
  },
  { 
    type: 'Photos', 
    filesCount: 0, 
    totalSize: '0MB', 
    colorClass: 'bg-amber-100 text-amber-600', 
    items: [] 
  },
  { 
    type: 'Movies', 
    filesCount: 0, 
    totalSize: '0MB', 
    colorClass: 'bg-teal-100 text-teal-600', 
    items: [] 
  },
  { 
    type: 'Other', 
    filesCount: 0, 
    totalSize: '0MB', 
    colorClass: 'bg-rose-100 text-rose-600', 
    items: [] 
  }
];

// ========== ONLINE STATUS FUNCTIONS ==========
// Set user online status
export const setUserOnline = async (userId: string, isOnline: boolean) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline: isOnline,
      lastSeen: serverTimestamp()
    });
    console.log(`✅ User ${userId} status updated: ${isOnline ? 'Online' : 'Offline'}`);
  } catch (error) {
    console.error("Error updating online status:", error);
  }
};

// Listen to user online status with real-time updates
export const listenToUserStatus = (userId: string, callback: (isOnline: boolean, lastSeen: Date) => void): Unsubscribe => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const isOnline = data.isOnline || false;
      const lastSeen = data.lastSeen?.toDate() || new Date();
      callback(isOnline, lastSeen);
    }
  }, (error) => {
    console.error(`Error listening to user ${userId} status:`, error);
  });
};

// Get user status text
export const getUserStatusText = (isOnline: boolean, lastSeen: Date): string => {
  if (isOnline) return 'Online';
  
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `Last seen ${diffMins} min ago`;
  if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

// Get online status of a user (single fetch)
export const getUserOnlineStatus = async (userId: string): Promise<{ isOnline: boolean; lastSeen: Date }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen?.toDate() || new Date()
      };
    }
    return { isOnline: false, lastSeen: new Date() };
  } catch (error) {
    console.error("Error getting user online status:", error);
    return { isOnline: false, lastSeen: new Date() };
  }
};
// ========== END ONLINE STATUS FUNCTIONS ==========

// ========== TYPING INDICATORS ==========
// Set typing status
export const setTypingStatus = async (chatId: string, userId: string, isTyping: boolean) => {
  try {
    const typingRef = doc(db, 'typingIndicators', chatId);
    await setDoc(typingRef, {
      [userId]: isTyping,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error setting typing status:", error);
  }
};

// Listen to typing status
export const listenToTypingStatus = (chatId: string, currentUserId: string, callback: (isTyping: boolean, typingUserId: string) => void) => {
  const typingRef = doc(db, 'typingIndicators', chatId);
  return onSnapshot(typingRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      // Find if someone else is typing
      for (const [userId, isTyping] of Object.entries(data)) {
        if (userId !== currentUserId && userId !== 'lastUpdated' && isTyping === true) {
          callback(true, userId);
          return;
        }
      }
      callback(false, '');
    } else {
      callback(false, '');
    }
  });
};
// ========== END TYPING INDICATORS ==========

// ========== PROFILE UPDATE FUNCTIONS ==========
// Update user profile (avatar, display name, etc.)
export const updateUserProfile = async (userId: string, updates: { avatar?: string; displayName?: string }) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log(`✅ User profile updated for: ${userId}`, updates);
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
};

// Get current user's profile from Firestore
export const getCurrentUserProfile = async () => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting current user profile:", error);
    return null;
  }
};
// ========== END PROFILE UPDATE FUNCTIONS ==========

// Search for users by name or email
export const searchUsers = async (searchTerm: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  
  console.log("🔍 Searching for:", searchTerm);
  
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;
      const userName = (userData.displayName || userData.fullName || '').toLowerCase();
      const email = (userData.email || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      if (userId !== currentUser.uid && 
          (userName.includes(searchLower) || email.includes(searchLower))) {
        users.push({
          uid: userId,
          name: userData.displayName || userData.fullName || userData.email?.split('@')[0] || 'User',
          email: userData.email,
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'User')}&background=00c5bc&color=fff`,
          role: userData.role || 'User',
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen?.toDate() || new Date()
        });
      }
    });
    
    console.log("Found users:", users);
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

// Get user profile by UID
export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Create or get existing chat - UPDATED with better error handling
export const createOrGetChat = async (otherUserId: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');
  
  console.log("💬 Creating/getting chat with user:", otherUserId);
  
  const chatId = getChatId(currentUser.uid, otherUserId);
  const chatRef = doc(db, 'chats', chatId);
  
  try {
    const chatDoc = await getDoc(chatRef);
    
    // Get user profiles
    const otherUserProfile = await getUserProfile(otherUserId);
    const currentUserProfile = await getUserProfile(currentUser.uid);
    
    const otherUserName = otherUserProfile?.displayName || otherUserProfile?.fullName || 'User';
    const currentUserName = currentUserProfile?.displayName || currentUser.email?.split('@')[0] || 'User';
    const otherUserAvatar = otherUserProfile?.avatar || '';
    const currentUserAvatar = currentUserProfile?.avatar || '';
    
    if (!chatDoc.exists()) {
      console.log("📝 Creating new chat document...");
      
      // Create chat document with proper participants array
      await setDoc(chatRef, {
        participants: [currentUser.uid, otherUserId],
        participantsInfo: {
          [currentUser.uid]: {
            name: currentUserName,
            avatar: currentUserAvatar
          },
          [otherUserId]: {
            name: otherUserName,
            avatar: otherUserAvatar
          }
        },
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    }
    
    // ALWAYS update/ensure both users have the chat in their userChats
    console.log("📝 Ensuring both users have chat in their lists...");
    
    // Add to current user's chat list
    const userChatRef = doc(db, 'userChats', currentUser.uid, 'chats', chatId);
    await setDoc(userChatRef, {
      chatId: chatId,
      otherUserId: otherUserId,
      otherUserName: otherUserName,
      otherUserAvatar: otherUserAvatar,
      lastUpdated: serverTimestamp()
    });
    
    // Add to other user's chat list
    const otherUserChatRef = doc(db, 'userChats', otherUserId, 'chats', chatId);
    await setDoc(otherUserChatRef, {
      chatId: chatId,
      otherUserId: currentUser.uid,
      otherUserName: currentUserName,
      otherUserAvatar: currentUserAvatar,
      lastUpdated: serverTimestamp()
    });
    
    console.log("✅ Chat setup complete for both users!");
    return chatId;
  } catch (error) {
    console.error("Error in createOrGetChat:", error);
    throw error;
  }
};

// Send a message with read tracking - UPDATED with proper error handling
export const sendMessage = async (chatId: string, text: string, imageUrl?: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');
  
  console.log("📤 Sending message to chat:", chatId);
  
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    
    const messageData: any = {
      text: text,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      timestamp: serverTimestamp(),
      read: false,
      readBy: [currentUser.uid],
      readAt: null,
      receiptStatus: 'sent',
      createdAt: serverTimestamp()
    };
    
    if (imageUrl) {
      messageData.image = imageUrl;
    }
    
    const messageDoc = await addDoc(messagesRef, messageData);
    
    // Update last message in chat
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    
    console.log("✅ Message sent successfully!");
    return messageDoc.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Mark message as read - UPDATED with error handling
export const markMessageAsRead = async (chatId: string, messageId: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      // Only mark as read if not already read by this user
      if (!messageData.readBy?.includes(currentUser.uid)) {
        await updateDoc(messageRef, {
          read: true,
          readAt: serverTimestamp(),
          readBy: arrayUnion(currentUser.uid),
          receiptStatus: 'read'
        });
        console.log("✓ Message marked as read:", messageId);
      }
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
    // Don't throw - this is non-critical
  }
};

// Mark all messages in chat as read - UPDATED with better error handling
export const markAllMessagesAsRead = async (chatId: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log("⚠️ No user logged in, cannot mark messages as read");
    return;
  }
  
  try {
    console.log(`📖 Marking all messages as read for chat: ${chatId} by user: ${currentUser.uid}`);
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    // Get all messages that don't have current user in readBy
    const allMessagesRef = collection(db, 'chats', chatId, 'messages');
    const allMessages = await getDocs(allMessagesRef);
    
    const batch = writeBatch(db);
    let count = 0;
    
    allMessages.forEach((doc) => {
      const data = doc.data();
      // Only mark if current user hasn't read it
      if (!data.readBy?.includes(currentUser.uid)) {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
          readBy: arrayUnion(currentUser.uid),
          receiptStatus: 'read'
        });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Marked ${count} messages as read for user ${currentUser.uid}`);
    } else {
      console.log("ℹ️ No new messages to mark as read");
    }
    
    // Also update the chat's unread count for this user
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${currentUser.uid}`]: 0
      });
    } catch (error) {
      console.warn("Could not update unread count:", error);
    }
    
  } catch (error) {
    console.error("Error marking messages as read:", error);
    // Don't throw - this is non-critical for the user experience
  }
};

// Listen to messages in real-time with read status - UPDATED with better error handling
export const listenToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  console.log("🎧 Listening to messages for chat:", chatId);
  
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date();
        const currentUser = getCurrentUser();
        
        // Determine if message is read by the other user
        let receiptStatus = 'sent';
        if (data.read === true) {
          receiptStatus = 'read';
        } else if (data.readBy?.length > 1) {
          receiptStatus = 'delivered';
        }
        
        return {
          id: doc.id,
          ...data,
          isSelf: data.senderId === currentUser?.uid,
          time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: timestamp,
          receiptStatus: receiptStatus,
          isRead: data.read || false,
          readBy: data.readBy || []
        };
      });
      console.log(`📨 Received ${messages.length} messages for chat ${chatId}`);
      callback(messages);
    }, (error) => {
      console.error('Error in message listener:', error);
      callback([]); // Return empty array on error
    });
  } catch (error) {
    console.error('Error setting up message listener:', error);
    callback([]);
    return () => {}; // Return empty cleanup function
  }
};

// Get all chats for current user with REAL-TIME ONLINE STATUS UPDATES
export const listenToUserChats = (callback: (chats: any[]) => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.log("No current user, returning empty callback");
    callback([]);
    return () => {};
  }
  
  console.log("🔄 Loading chats for user:", currentUser.uid);
  
  const userChatsRef = collection(db, 'userChats', currentUser.uid, 'chats');
  const q = query(userChatsRef, orderBy('lastUpdated', 'desc'));
  
  // Store cleanup functions for status listeners
  let statusUnsubscribes: (() => void)[] = [];
  let isMounted = true;
  
  // Helper to update chat statuses
  const updateChatStatus = (chats: any[], userId: string, isOnline: boolean, lastSeen: Date) => {
    return chats.map(chat => {
      // Find the other user in this chat
      const otherUserId = chat.participants?.find((p: string) => p !== userId);
      if (otherUserId === userId) {
        const statusText = isOnline ? 'Online' : getUserStatusText(isOnline, lastSeen);
        return { ...chat, statusText };
      }
      return chat;
    });
  };
  
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    if (!isMounted) return;
    
    console.log(`📋 Found ${snapshot.docs.length} chats for user`);
    const chats = [];
    const userIdsToWatch: string[] = [];
    
    for (const chatDoc of snapshot.docs) {
      try {
        const chatData = chatDoc.data();
        const chatId = chatData.chatId || chatDoc.id;
        const otherUserId = chatData.otherUserId;
        
        if (otherUserId && !userIdsToWatch.includes(otherUserId)) {
          userIdsToWatch.push(otherUserId);
        }
        
        // Get other user profile
        let otherUserProfile = null;
        try {
          otherUserProfile = await getUserProfile(otherUserId);
        } catch (error) {
          console.warn(`Could not get profile for user ${otherUserId}:`, error);
        }
        
        // Get ALL messages for this chat
        let messages = [];
        try {
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
          const messagesSnapshot = await getDocs(messagesQuery);
          
          messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate?.() || new Date();
            let receiptStatus = 'sent';
            if (data.read === true) {
              receiptStatus = 'read';
            } else if (data.readBy?.length > 1) {
              receiptStatus = 'delivered';
            }
            
            return {
              id: doc.id,
              ...data,
              isSelf: data.senderId === currentUser.uid,
              time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: timestamp,
              receiptStatus: receiptStatus,
              isRead: data.read || false,
              readBy: data.readBy || []
            };
          });
        } catch (error) {
          console.warn(`Could not load messages for chat ${chatId}:`, error);
          messages = [];
        }
        
        // Count unread messages
        const unreadCount = messages.filter(msg => 
          !msg.isSelf && !msg.readBy?.includes(currentUser.uid)
        ).length;
        
        // Get online status - CRITICAL: Use the latest profile data
        const isOtherUserOnline = otherUserProfile?.isOnline || false;
        const lastSeen = otherUserProfile?.lastSeen?.toDate() || new Date();
        const statusText = isOtherUserOnline ? 'Online' : getUserStatusText(isOtherUserOnline, lastSeen);
        
        // Create complete chat object with ALL messages
        chats.push({
          id: chatId,
          name: chatData.otherUserName || 'User',
          type: 'direct',
          avatar: otherUserProfile?.avatar || chatData.otherUserAvatar || '',
          avatarInitials: chatData.otherUserName?.substring(0, 2).toUpperCase() || 'U',
          avatarColor: 'bg-[#00c5bc] text-white',
          statusText: statusText,
          isTyping: false,
          typingUser: '',
          messages: messages,
          unreadCount: unreadCount,
          membersCount: 2,
          filesCount: 0,
          linksCount: 0,
          sharedFiles: DEFAULT_SHARED_FILES,
          isMuted: false,
          isArchived: false,
          participants: [currentUser.uid, otherUserId]
        });
      } catch (error) {
        console.error(`Error processing chat ${chatDoc.id}:`, error);
        // Skip this chat and continue with others
      }
    }
    
    console.log(`✅ Returning ${chats.length} chats with ${chats.reduce((acc, chat) => acc + chat.messages.length, 0)} total messages`);
    callback(chats);
    
    // Clean up previous status listeners
    statusUnsubscribes.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    statusUnsubscribes = [];
    
    // Set up REAL-TIME status listeners for each other user
    userIdsToWatch.forEach(userId => {
      if (userId !== currentUser.uid) {
        const unsub = listenToUserStatus(userId, (isOnline, lastSeen) => {
          if (!isMounted) return;
          console.log(`🔄 Status update for user ${userId}: ${isOnline ? 'Online' : 'Offline'}`);
          
          // Update the chat list with new status
          callback(chats.map(chat => {
            if (chat.participants?.includes(userId)) {
              const statusText = isOnline ? 'Online' : getUserStatusText(isOnline, lastSeen);
              return { ...chat, statusText };
            }
            return chat;
          }));
        });
        statusUnsubscribes.push(unsub);
      }
    });
  }, (error) => {
    console.error('Error in chat listener:', error);
    callback([]);
  });
  
  // Return cleanup function
  return () => {
    isMounted = false;
    unsubscribe();
    statusUnsubscribes.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
  };
};

// Delete a message - UPDATED with error handling
export const deleteMessage = async (chatId: string, messageId: string) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const data = messageDoc.data();
    if (data.senderId !== currentUser.uid) {
      throw new Error('You can only delete your own messages');
    }
    
    await deleteDoc(messageRef);
    console.log("🗑️ Message deleted:", messageId);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Update message properties - UPDATED with error handling
export const updateMessage = async (chatId: string, messageId: string, updates: any) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');
    
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }
    
    const data = messageDoc.data();
    if (data.senderId !== currentUser.uid) {
      throw new Error('You can only update your own messages');
    }
    
    await updateDoc(messageRef, {
      ...updates,
      editedAt: serverTimestamp()
    });
    console.log("📝 Message updated:", messageId, updates);
  } catch (error) {
    console.error("Error updating message:", error);
    throw error;
  }
};