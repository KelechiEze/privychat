import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, ChevronLeft, FileText, Image, Video, FileQuestion, 
  ArrowRight, Folder, Link as LinkIcon, MoreHorizontal, Download, 
  Trash2, X, AlertCircle 
} from 'lucide-react';
import { Chat, Message, SharedFile, SharedFileGroup } from '../types';
import { db } from '../firebase/config';
import { doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { getCurrentUser } from '../services/chatService';

interface SharedFilesPanelProps {
  chat: Chat;
  onFileDeleted?: (fileName: string) => void;
}

export default function SharedFilesPanel({ chat, onFileDeleted }: SharedFilesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localSharedFiles, setLocalSharedFiles] = useState<SharedFileGroup[]>([]);

  // Initialize and update shared files from chat messages
  useEffect(() => {
    if (chat && chat.messages) {
      const extractedFiles = extractFilesFromMessages(chat.messages);
      setLocalSharedFiles(extractedFiles);
    }
  }, [chat.messages]);

  // Extract files from messages
  const extractFilesFromMessages = (messages: Message[]): SharedFileGroup[] => {
    const fileGroups: SharedFileGroup[] = [
      { type: 'Documents', filesCount: 0, totalSize: '0MB', colorClass: 'bg-purple-100 text-purple-600', items: [] },
      { type: 'Photos', filesCount: 0, totalSize: '0MB', colorClass: 'bg-amber-100 text-amber-600', items: [] },
      { type: 'Movies', filesCount: 0, totalSize: '0MB', colorClass: 'bg-teal-100 text-teal-600', items: [] },
      { type: 'Other', filesCount: 0, totalSize: '0MB', colorClass: 'bg-rose-100 text-rose-600', items: [] }
    ];

    messages.forEach((message) => {
      // Check for image attachments
      if (message.image) {
        const isVideo = message.image.includes('video') || 
                       message.image.endsWith('.mp4') || 
                       message.image.endsWith('.mov') ||
                       message.image.endsWith('.avi') ||
                       message.image.endsWith('.mkv');
        
        const isImage = !isVideo && (
          message.image.includes('image') || 
          message.image.endsWith('.jpg') || 
          message.image.endsWith('.jpeg') || 
          message.image.endsWith('.png') || 
          message.image.endsWith('.gif') ||
          message.image.endsWith('.webp') ||
          message.image.endsWith('.bmp')
        );

        const isDocument = !isVideo && !isImage && (
          message.image.endsWith('.pdf') ||
          message.image.endsWith('.doc') ||
          message.image.endsWith('.docx') ||
          message.image.endsWith('.txt') ||
          message.image.endsWith('.xls') ||
          message.image.endsWith('.xlsx') ||
          message.image.endsWith('.ppt') ||
          message.image.endsWith('.pptx')
        );

        let fileType: 'Documents' | 'Photos' | 'Movies' | 'Other' = 'Other';
        if (isVideo) fileType = 'Movies';
        else if (isImage) fileType = 'Photos';
        else if (isDocument) fileType = 'Documents';

        const fileName = message.image.split('/').pop() || `file_${Date.now()}`;
        const fileSize = getFileSize(message.image);
        
        const sharedFile: SharedFile = {
          name: fileName,
          size: fileSize,
          date: message.time || new Date().toLocaleDateString(),
          messageId: message.id,
          fileUrl: message.image,
          fileType: fileType
        };

        const group = fileGroups.find(g => g.type === fileType);
        if (group && !group.items.some(item => item.name === fileName && item.messageId === message.id)) {
          group.items.push(sharedFile);
          group.filesCount = group.items.length;
          // Update total size
          const totalBytes = group.items.reduce((acc, item) => acc + parseFileSize(item.size), 0);
          group.totalSize = formatFileSize(totalBytes);
        }
      }

      // Check for links in message text
      if (message.text) {
        const urls = message.text.match(/https?:\/\/[^\s]+/g) || [];
        urls.forEach((url, index) => {
          const linkFile: SharedFile = {
            name: `Link ${index + 1}`,
            size: '0KB',
            date: message.time || new Date().toLocaleDateString(),
            messageId: message.id,
            fileUrl: url,
            fileType: 'Other',
            isLink: true
          };
          const otherGroup = fileGroups.find(g => g.type === 'Other');
          if (otherGroup && !otherGroup.items.some(item => item.fileUrl === url)) {
            otherGroup.items.push(linkFile);
            otherGroup.filesCount = otherGroup.items.length;
          }
        });
      }
    });

    return fileGroups;
  };

  // Helper to get file size from URL or data
  const getFileSize = (url: string): string => {
    if (url.startsWith('data:')) {
      const base64Length = url.length - url.indexOf(',') - 1;
      const sizeInBytes = Math.ceil(base64Length * 0.75);
      return formatFileSize(sizeInBytes);
    }
    return '1MB'; // Default for external URLs
  };

  // Parse file size string to bytes
  const parseFileSize = (size: string): number => {
    const units: { [key: string]: number } = {
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };
    for (const [unit, multiplier] of Object.entries(units)) {
      if (size.includes(unit)) {
        return parseFloat(size) * multiplier;
      }
    }
    return parseFloat(size) || 0;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)}MB`;
    const kb = bytes / 1024;
    if (kb >= 1) return `${kb.toFixed(1)}KB`;
    return `${bytes}B`;
  };

  // Helper to determine the dynamic category icon
  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'Documents':
        return <FileText className="w-4 h-4" />;
      case 'Photos':
        return <Image className="w-4 h-4" />;
      case 'Movies':
        return <Video className="w-4 h-4" />;
      default:
        return <FileQuestion className="w-4 h-4" />;
    }
  };

  // Get file icon based on type
  const getFileIcon = (file: SharedFile) => {
    if (file.isLink) return <LinkIcon className="w-4 h-4 text-blue-500" />;
    if (file.fileType === 'Photos') return <Image className="w-4 h-4 text-amber-500" />;
    if (file.fileType === 'Movies') return <Video className="w-4 h-4 text-teal-500" />;
    if (file.fileType === 'Documents') return <FileText className="w-4 h-4 text-purple-500" />;
    return <FileQuestion className="w-4 h-4 text-rose-500" />;
  };

  // Delete a file from the chat
  const deleteFileFromChat = async (file: SharedFile) => {
    if (!file.messageId) {
      alert('Cannot delete this file: message ID not found');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to delete files');
      return;
    }

    setIsDeleting(true);
    try {
      // Get the message to verify ownership
      const messageRef = doc(db, 'chats', chat.id, 'messages', file.messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        alert('Message not found');
        return;
      }

      const messageData = messageDoc.data();
      
      // Only allow deletion if user is the sender or admin
      if (messageData.senderId !== currentUser.uid) {
        alert('You can only delete your own shared files');
        return;
      }

      // Remove the image from the message
      await updateDoc(messageRef, {
        image: arrayRemove(file.fileUrl)
      });

      // Update local state
      setLocalSharedFiles(prev => 
        prev.map(group => ({
          ...group,
          items: group.items.filter(item => 
            !(item.messageId === file.messageId && item.fileUrl === file.fileUrl)
          ),
          filesCount: group.items.filter(item => 
            !(item.messageId === file.messageId && item.fileUrl === file.fileUrl)
          ).length
        }))
      );

      // Update the chat's files count in the parent component
      if (onFileDeleted) {
        onFileDeleted(file.name);
      }

      setShowDeleteConfirm(null);
      console.log('✅ File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get display name for file
  const getDisplayName = (file: SharedFile) => {
    if (file.isLink) {
      try {
        const url = new URL(file.fileUrl || '');
        return url.hostname.replace('www.', '');
      } catch {
        return file.name;
      }
    }
    return file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
  };

  const filesCount = localSharedFiles.reduce((sum, group) => sum + (group.filesCount || 0), 0);
  const linksCount = localSharedFiles.find(g => g.type === 'Other')?.items.filter(item => item.isLink).length || 0;
  const membersCount = chat.membersCount || 2;

  return (
    <div id="shared-files-panel" className="w-[300px] min-w-[300px] h-full bg-[#fcfdfe] border-l border-[#f1f3f6] flex flex-col pt-5 pb-4 select-none overflow-y-auto scrollbar-thin">
      
      {/* Header element with toggle arrow */}
      <div className="px-5 flex items-center gap-3 mb-6 select-none shrink-0">
        <button className="w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-bold text-[#1a2c3a] uppercase tracking-wider">Shared files</span>
      </div>

      {/* Circle main banner */}
      <div className="flex flex-col items-center mb-6 px-5 text-center select-none shrink-0">
        <div className="w-[72px] h-[72px] rounded-full overflow-hidden p-0.5 border border-gray-100 mb-3 shadow-xs">
          <img
            src={chat.avatar || "/src/assets/images/real_estate_skyline_1781438641121.jpg"}
            alt={chat.name}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <h3 className="text-[11.5px] font-bold text-[#1a2c3a]">{chat.name}</h3>
        <p className="text-[9.5px] font-semibold text-[#8e9cae] mt-0.5">{membersCount} members</p>
      </div>

      {/* Adjacent summary stats boxes */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-6 shrink-0">
        
        {/* All Files Box */}
        <div className="bg-[#e4f8f7] rounded-2xl p-3.5 flex flex-col items-start shadow-2xs border border-[#d2f4f1] hover:shadow-xs transition-shadow">
          <div className="w-7 h-7 rounded-lg bg-[#00c5bc] text-white flex items-center justify-center mb-2.5">
            <Folder className="w-4 h-4 stroke-[2]" />
          </div>
          <span className="text-[9px] font-bold text-gray-400 capitalize">All files</span>
          <span className="text-sm font-bold text-gray-700 mt-0.5">{filesCount}</span>
        </div>

        {/* All Links Box */}
        <div className="bg-[#f5f7fa] rounded-2xl p-3.5 flex flex-col items-start border border-[#eef1f5] hover:shadow-2xs transition-shadow">
          <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center mb-2.5">
            <LinkIcon className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold text-gray-400 capitalize">All links</span>
          <span className="text-sm font-bold text-gray-700 mt-0.5">{linksCount}</span>
        </div>

      </div>

      {/* Main File Type Section */}
      <div className="flex-1 px-5 flex flex-col shrink-0">
        
        {selectedCategory === null ? (
          <>
            {/* Standard Mockup view list */}
            <div className="flex items-center justify-between mb-3 select-none">
              <span className="text-[10px] uppercase font-bold text-[#9aa6b7] tracking-wider">File type</span>
              <button className="w-5 h-5 text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {localSharedFiles.map((group) => (
                <button
                  key={group.type}
                  onClick={() => setSelectedCategory(group.type)}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50 cursor-pointer text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.colorClass} shrink-0`}>
                      {getCategoryIcon(group.type)}
                    </div>
                    <div>
                      <h4 className="text-[10.5px] font-bold text-gray-800">{group.type}</h4>
                      <p className="text-[9.5px] text-gray-400 font-semibold">
                        {group.filesCount || 0} files, {group.totalSize || '0MB'}
                      </p>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Category Detailed Sub-list Drawer */
          <div className="flex flex-col h-full animate-fade-in">
            {/* Header sub-bar */}
            <div className="flex items-center justify-between mb-3.5 select-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-[10px] font-bold text-[#00c5bc] flex items-center gap-0.5 cursor-pointer hover:underline"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Back to types</span>
              </button>
              <span className="text-[10px] uppercase font-bold text-gray-800 tracking-wider">
                {selectedCategory}
              </span>
            </div>

            {/* List the items nested */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              {localSharedFiles
                .find((g) => g.type === selectedCategory)
                ?.items?.map((item, idx) => (
                  <div
                    key={`${item.messageId}-${idx}`}
                    className="p-3 bg-[#fbfcfd] border border-gray-100 rounded-xl hover:shadow-2xs transition-shadow flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex items-center gap-2">
                        {getFileIcon(item)}
                        <h4 className="text-[10px] font-bold text-gray-800 truncate" title={item.name}>
                          {getDisplayName(item)}
                        </h4>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                        {item.size} • {item.date}
                        {item.isLink && ' • Link'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.fileUrl && !item.isLink && (
                        <button
                          onClick={() => window.open(item.fileUrl, '_blank')}
                          className="w-6 h-6 rounded-md bg-[#e4f8f7] text-[#00c5bc] hover:bg-[#00c5bc] hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          title="View/Download File"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                      {item.isLink && item.fileUrl && (
                        <button
                          onClick={() => window.open(item.fileUrl, '_blank')}
                          className="w-6 h-6 rounded-md bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          title="Open Link"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(item.messageId || '')}
                        className="w-6 h-6 rounded-md bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm === item.messageId && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-gray-800">Delete File</h3>
                              <p className="text-[10px] text-gray-500">This action cannot be undone</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{item.name}</strong> from this chat?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200 transition-colors"
                              disabled={isDeleting}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteFileFromChat(item)}
                              className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {(!localSharedFiles.find((g) => g.type === selectedCategory)?.items || 
                localSharedFiles.find((g) => g.type === selectedCategory)?.items?.length === 0) && (
                <div className="text-center py-8 text-[9.5px] text-gray-400">
                  No files shared in this category yet
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}