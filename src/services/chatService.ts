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
  Unsubscribe,
  startAfter,
  Timestamp
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

export const listenToTypingStatus = (chatId: string, currentUserId: string, callback: (isTyping: boolean, typingUserId: string) => void) => {
  const typingRef = doc(db, 'typingIndicators', chatId);
  return onSnapshot(typingRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
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

// Create or get existing chat
export const createOrGetChat = async (otherUserId: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');
  
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
        lastUpdated: serverTimestamp(),
        unreadCount: {
          [currentUser.uid]: 0,
          [otherUserId]: 0
        }
      });
    }
    
    // Update both users' chat lists
    const userChatRef = doc(db, 'userChats', currentUser.uid, 'chats', chatId);
    await setDoc(userChatRef, {
      chatId: chatId,
      otherUserId: otherUserId,
      otherUserName: otherUserName,
      otherUserAvatar: otherUserAvatar,
      lastUpdated: serverTimestamp()
    });
    
    const otherUserChatRef = doc(db, 'userChats', otherUserId, 'chats', chatId);
    await setDoc(otherUserChatRef, {
      chatId: chatId,
      otherUserId: currentUser.uid,
      otherUserName: currentUserName,
      otherUserAvatar: currentUserAvatar,
      lastUpdated: serverTimestamp()
    });
    
    return chatId;
  } catch (error) {
    console.error("Error in createOrGetChat:", error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (chatId: string, text: string, imageUrl?: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');
  
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const chatRef = doc(db, 'chats', chatId);
    
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
    
    // Update chat metadata
    const chatDoc = await getDoc(chatRef);
    const chatData = chatDoc.data();
    const otherUserId = chatData?.participants?.find((id: string) => id !== currentUser.uid);
    
    const updateData: any = {
      lastMessage: text || (imageUrl ? '📷 Image' : ''),
      lastMessageTime: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };
    
    // Increment unread count for the other user
    if (otherUserId) {
      updateData[`unreadCount.${otherUserId}`] = increment(1);
    }
    
    await updateDoc(chatRef, updateData);
    
    // Update userChats for both users
    const currentUserChatRef = doc(db, 'userChats', currentUser.uid, 'chats', chatId);
    const otherUserChatRef = doc(db, 'userChats', otherUserId, 'chats', chatId);
    
    await Promise.all([
      updateDoc(currentUserChatRef, { lastUpdated: serverTimestamp() }),
      updateDoc(otherUserChatRef, { lastUpdated: serverTimestamp() })
    ]);
    
    return messageDoc.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (chatId: string, messageId: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      if (!messageData.readBy?.includes(currentUser.uid)) {
        await updateDoc(messageRef, {
          read: true,
          readAt: serverTimestamp(),
          readBy: arrayUnion(currentUser.uid),
          receiptStatus: 'read'
        });
      }
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};

// Mark all messages in chat as read
export const markAllMessagesAsRead = async (chatId: string) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const chatRef = doc(db, 'chats', chatId);
    
    // Get unread messages (limit to last 100 for efficiency)
    const unreadQuery = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(unreadQuery);
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.readBy?.includes(currentUser.uid) && data.senderId !== currentUser.uid) {
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
    }
    
    // Reset unread count
    await updateDoc(chatRef, {
      [`unreadCount.${currentUser.uid}`]: 0
    });
    
    console.log(`✅ Marked ${count} messages as read`);
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

// ========== OPTIMIZED MESSAGE LISTENING WITH PAGINATION ==========
export const listenToMessagesPaginated = (
  chatId: string,
  callback: (messages: any[]) => void,
  pageSize: number = 30
): Unsubscribe => {
  const currentUser = getCurrentUser();
  
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(
    messagesRef,
    orderBy('timestamp', 'desc'),
    limit(pageSize)
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map(doc => {
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
          isSelf: data.senderId === currentUser?.uid,
          time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: timestamp,
          receiptStatus: receiptStatus,
          isRead: data.read || false,
          readBy: data.readBy || []
        };
      })
      .reverse(); // Show oldest first
    
    callback(messages);
  }, (error) => {
    console.error('Error listening to messages:', error);
    callback([]);
  });
};

// Load more messages for infinite scroll
export const loadMoreMessages = async (
  chatId: string,
  oldestMessageTimestamp: Date,
  pageSize: number = 20
): Promise<any[]> => {
  const currentUser = getCurrentUser();
  
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(
    messagesRef,
    orderBy('timestamp', 'desc'),
    where('timestamp', '<', Timestamp.fromDate(oldestMessageTimestamp)),
    limit(pageSize)
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs
    .map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate?.() || new Date();
      
      return {
        id: doc.id,
        ...data,
        isSelf: data.senderId === currentUser?.uid,
        time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: timestamp,
        isRead: data.read || false,
        readBy: data.readBy || []
      };
    })
    .reverse();
};

// ========== OPTIMIZED CHAT LIST LOADING ==========
export const listenToUserChatsOptimized = (callback: (chats: any[]) => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    callback([]);
    return () => {};
  }
  
  const userChatsRef = collection(db, 'userChats', currentUser.uid, 'chats');
  const q = query(userChatsRef, orderBy('lastUpdated', 'desc'));
  
  let statusUnsubscribes: (() => void)[] = [];
  let isMounted = true;
  
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    if (!isMounted) return;
    
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
          console.warn(`Could not get profile for user ${otherUserId}`);
        }
        
        // Get unread count from chat document
        let unreadCount = 0;
        let lastMessagePreview = '';
        try {
          const chatRef = doc(db, 'chats', chatId);
          const fullChatDoc = await getDoc(chatRef);
          if (fullChatDoc.exists()) {
            const fullChatData = fullChatDoc.data();
            unreadCount = fullChatData.unreadCount?.[currentUser.uid] || 0;
            lastMessagePreview = fullChatData.lastMessage || '';
          }
        } catch (error) {
          console.warn(`Could not get chat metadata for ${chatId}`);
        }
        
        const isOtherUserOnline = otherUserProfile?.isOnline || false;
        const lastSeen = otherUserProfile?.lastSeen?.toDate() || new Date();
        const statusText = isOtherUserOnline ? 'Online' : getUserStatusText(isOtherUserOnline, lastSeen);
        
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
          messages: [], // Load messages only when chat is opened
          lastMessage: lastMessagePreview,
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
      }
    }
    
    callback(chats);
    
    // Clean up previous status listeners
    statusUnsubscribes.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    statusUnsubscribes = [];
    
    // Set up real-time status listeners
    userIdsToWatch.forEach(userId => {
      if (userId !== currentUser.uid) {
        const unsub = listenToUserStatus(userId, (isOnline, lastSeen) => {
          if (!isMounted) return;
          
          // Re-fetch all chats with updated status
          // This ensures the UI updates with new online status
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
  
  return () => {
    isMounted = false;
    unsubscribe();
    statusUnsubscribes.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
  };
};

// ========== ORIGINAL LISTEN TO MESSAGES (FOR BACKWARD COMPATIBILITY) ==========
export const listenToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  // Use the new paginated version by default
  return listenToMessagesPaginated(chatId, callback);
};

// ========== ORIGINAL LISTEN TO USER CHATS (FOR BACKWARD COMPATIBILITY) ==========
export const listenToUserChats = (callback: (chats: any[]) => void) => {
  // Use the new optimized version
  return listenToUserChatsOptimized(callback);
};

// Delete a message
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

// Update message properties
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

// Archive old messages (optional, for performance)
export const archiveOldMessages = async (chatId: string, beforeDate: Date, batchSize: number = 500) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('timestamp', '<', Timestamp.fromDate(beforeDate)),
      orderBy('timestamp', 'asc'),
      limit(batchSize)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;
    
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Archived ${snapshot.docs.length} old messages from chat ${chatId}`);
    return snapshot.docs.length;
  } catch (error) {
    console.error("Error archiving messages:", error);
    return 0;
  }
};

// Get total message count for a chat
export const getMessageCount = async (chatId: string): Promise<number> => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snapshot = await getDocs(messagesRef);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting message count:", error);
    return 0;
  }
};