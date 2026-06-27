import React from 'react';
import { Clock, MessageSquare, Eye, Users, BarChart2, Video, LogOut } from 'lucide-react';
import { CURRENT_USER } from '../data';

interface NavigationRailProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { name: string; avatar: string };
  onChangeAvatar?: (url: string) => void;
  onLogout?: () => void;
}

export default function NavigationRail({ activeTab, setActiveTab, currentUser, onChangeAvatar, onLogout }: NavigationRailProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChangeAvatar) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          onChangeAvatar(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { id: 'chats', icon: Users, label: 'Chats' },
  ];

  return (
    <div id="nav-rail" className="w-[68px] min-w-[68px] h-full bg-[#fcfdfe] border-r border-[#f1f3f6] flex flex-col items-center py-6 justify-between select-none">
      {/* Brand logo matching image */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 relative flex items-center justify-center cursor-pointer mb-8">
          {/* Custom SVG duplicating the precise logo geometry from the screenshot */}
          <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8L20 16L12 24" stroke="#00c5bc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M28 32L20 24L28 16" stroke="#ff5c8a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Navigation Items list */}
        <div className="flex flex-col gap-3 w-full px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? 'bg-[#e6f7f6] text-[#11b5ac]'
                    : 'text-[#9aa6b7] hover:bg-[#f6f8fb] hover:text-[#536173]'
                }`}
              >
                {/* Selected vertical bar indicator of exact width like the image */}
                {isActive && (
                  <div className="absolute left-[-8px] top-1/4 bottom-1/4 w-[4px] bg-[#11b5ac] rounded-r-md" />
                )}
                <IconComponent className={`w-[18px] h-[18px] ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* User profile avatar and logout at bottom */}
      <div className="flex flex-col items-center gap-4">
        {onLogout && (
          <button
            onClick={onLogout}
            title="Log out of session"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#9aa6b7] hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px] stroke-[1.8]" />
          </button>
        )}

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative cursor-pointer group"
          title="Click to select profile picture from device"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            className="hidden" 
          />
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full border border-gray-200 object-cover ring-2 ring-transparent group-hover:ring-[#11b5ac]/40 transition-all duration-200"
          />
          {/* Active indicator dot */}
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-[#4ade80]" />
        </div>
      </div>
    </div>
  );
}
