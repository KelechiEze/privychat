import { Chat, Participant } from './types';

// Let's import the local image assets if we want, or just write them as URL strings.
// Since the generated images are:
// - /src/assets/images/jontray_arnold_avatar_1781438623117.jpg
// - /src/assets/images/real_estate_skyline_1781438641121.jpg
export const CURRENT_USER = {
  name: "Jontray Arnold",
  status: "available",
  avatar: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg",
};

export const SKYLINE_BANNER = "/src/assets/images/real_estate_skyline_1781438641121.jpg";

export const INITIAL_CHATS: Chat[] = [
  {
    id: "real-estate",
    name: "Real estate deals",
    type: "group",
    avatar: "/src/assets/images/real_estate_skyline_1781438641121.jpg",
    statusText: "typing...",
    isTyping: true,
    typingUser: "Robert",
    membersCount: 10,
    filesCount: 231,
    linksCount: 45,
    messages: [
      {
        id: "m1",
        senderName: "Evan Scott",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
        text: "Hi everyone, let's start the call soon 😊",
        time: "11:24 AM",
        isSelf: false
      },
      {
        id: "m2",
        senderName: "Kate Johnson",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
        text: "Recently I saw properties in a great location that I did not pay attention to before 😊",
        time: "11:24 AM",
        isSelf: false
      },
      {
        id: "m3",
        senderName: "Evan Scott",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
        text: "Ooo, why don't you say something more",
        time: "11:25 AM",
        isSelf: false
      },
      {
        id: "m4",
        senderName: "Robert",
        senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
        text: "@Robert? 😮",
        time: "11:25 AM",
        isSelf: false
      },
      {
        id: "m5",
        senderName: "You",
        senderAvatar: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg",
        text: "He creates an atmosphere of mystery 😊",
        time: "11:26 AM",
        isSelf: true,
        reactions: ["😎", "🤫"],
        receiptStatus: "read"
      },
      {
        id: "m6",
        senderName: "Evan Scott",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
        text: "Robert, don't be like that and say something more :)",
        time: "11:34 AM",
        isSelf: false,
        isRead: true
      }
    ],
    sharedFiles: [
      {
        type: "Documents",
        filesCount: 120,
        totalSize: "193MB",
        colorClass: "bg-purple-100 text-purple-600",
        items: [
          { name: "Property_Agreement_Signed.pdf", size: "12.4 MB", date: "June 12, 2026" },
          { name: "Financial_Forecast_Q3_RealEstate.xlsx", size: "4.8 MB", date: "June 10, 2026" },
          { name: "Location_Deed_Overview.pdf", size: "8.2 MB", date: "June 09, 2026" },
          { name: "Brokerage_Consolidated_v2.docx", size: "1.1 MB", date: "June 05, 2026" },
        ]
      },
      {
        type: "Photos",
        filesCount: 53,
        totalSize: "321MB",
        colorClass: "bg-amber-100 text-amber-600",
        items: [
          { name: "Facade_North_Render.jpg", size: "15.2 MB", date: "June 14, 2026" },
          { name: "Interior_LivingRoom_Alternative.png", size: "8.9 MB", date: "June 13, 2026" },
          { name: "Drone_Site_Map.jpg", size: "24.1 MB", date: "June 11, 2026" },
        ]
      },
      {
        type: "Movies",
        filesCount: 3,
        totalSize: "210MB",
        colorClass: "bg-teal-100 text-teal-600",
        items: [
          { name: "3D_Property_Virtual_Tour.mp4", size: "145.0 MB", date: "June 08, 2026" },
          { name: "Marketing_Intro_Draft_v3.mp4", size: "65.0 MB", date: "June 04, 2026" },
        ]
      },
      {
        type: "Other",
        filesCount: 49,
        totalSize: "194MB",
        colorClass: "bg-rose-100 text-rose-600",
        items: [
          { name: "Archived_Zipped_Old_Floorplans.zip", size: "185.3 MB", date: "May 28, 2026" },
          { name: "Contact_List_Import.csv", size: "8.7 MB", date: "May 25, 2026" },
        ]
      },
    ]
  },
  {
    id: "kate",
    name: "Kate Johnson",
    type: "direct",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
    statusText: "I will send the document s...",
    unreadCount: 1,
    membersCount: 2,
    filesCount: 14,
    linksCount: 8,
    messages: [
      {
        id: "kate1",
        senderName: "Kate Johnson",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
        text: "Hello! Jontray, are we meeting up for the property tour today?",
        time: "10:00 AM",
        isSelf: false,
        isRead: true
      },
      {
        id: "kate2",
        senderName: "You",
        senderAvatar: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg",
        text: "Yes, I am heading over to the location right now. See you there!",
        time: "10:15 AM",
        isSelf: true,
        receiptStatus: "read"
      },
      {
        id: "kate3",
        senderName: "Kate Johnson",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
        text: "Awesome. I will send the documents beforehand to review.",
        time: "11:15 AM",
        isSelf: false,
        isRead: false
      }
    ],
    sharedFiles: [
      {
        type: "Documents",
        filesCount: 8,
        totalSize: "45MB",
        colorClass: "bg-purple-100 text-purple-600",
        items: [
          { name: "Tour_Itinerary.pdf", size: "1.2 MB", date: "June 14, 2026" },
          { name: "Brokerage_Agreement_Kate.pdf", size: "3.5 MB", date: "June 13, 2026" }
        ]
      },
      {
        type: "Photos",
        filesCount: 4,
        totalSize: "12MB",
        colorClass: "bg-amber-100 text-amber-600",
        items: [
          { name: "Site_Plan_Overview.png", size: "4.0 MB", date: "June 14, 2026" }
        ]
      },
      {
        type: "Movies",
        filesCount: 1,
        totalSize: "25MB",
        colorClass: "bg-teal-100 text-teal-600",
        items: [
          { name: "Site_Walkthrough_HD.mp4", size: "25.0 MB", date: "June 13, 2026" }
        ]
      },
      {
        type: "Other",
        filesCount: 1,
        totalSize: "3MB",
        colorClass: "bg-rose-100 text-rose-600",
        items: [
          { name: "Contract_Revisions.zip", size: "3.1 MB", date: "June 12, 2026" }
        ]
      }
    ]
  },
  {
    id: "tamara",
    name: "Tamara Shevchenko",
    type: "direct",
    avatar: "",
    avatarInitials: "TS",
    avatarColor: "bg-[#00c5bc] text-white",
    statusText: "are you going to a busine...",
    membersCount: 2,
    filesCount: 32,
    linksCount: 11,
    messages: [
      {
        id: "tam1",
        senderName: "Tamara Shevchenko",
        senderAvatar: "",
        senderInitials: "TS",
        text: "Hey! Are you going to a business incubator tomorrow morning? I have a pass.",
        time: "10:05 AM",
        isSelf: false
      },
      {
        id: "tam2",
        senderName: "You",
        senderAvatar: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg",
        text: "That sounds incredible, Tamara! Let's check my calendar. Yes, I can make it after 10 AM.",
        time: "10:12 AM",
        isSelf: true
      }
    ],
    sharedFiles: [
      {
        type: "Documents",
        filesCount: 15,
        totalSize: "88MB",
        colorClass: "bg-purple-100 text-purple-600",
        items: [
          { name: "Incubator_Proposal_Draft.docx", size: "2.4 MB", date: "June 14, 2026" }
        ]
      },
      {
        type: "Photos",
        filesCount: 12,
        totalSize: "40MB",
        colorClass: "bg-amber-100 text-amber-600",
        items: [
          { name: "Pitch_Deck_Slide1.png", size: "3.1 MB", date: "June 13, 2026" }
        ]
      },
      {
        type: "Movies",
        filesCount: 2,
        totalSize: "120MB",
        colorClass: "bg-teal-100 text-teal-600",
        items: [
          { name: "Pitch_Video.mp4", size: "115.0 MB", date: "June 12, 2026" }
        ]
      },
      {
        type: "Other",
        filesCount: 3,
        totalSize: "10MB",
        colorClass: "bg-rose-100 text-rose-600",
        items: [
          { name: "Incubator_Excel_Feedback.zip", size: "8.5 MB", date: "June 10, 2026" }
        ]
      }
    ]
  },
  {
    id: "joshua",
    name: "Joshua Clarkson",
    type: "direct",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
    statusText: "I suggest to start, I have n...",
    membersCount: 2,
    filesCount: 9,
    linksCount: 3,
    messages: [
      {
        id: "josh1",
        senderName: "You",
        senderAvatar: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg",
        text: "Did you review the land appraisal values Joshua?",
        time: "2:50 PM",
        isSelf: true
      },
      {
        id: "josh2",
        senderName: "Joshua Clarkson",
        senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
        text: "I suggest to start, I have no concerns regarding the land and appraisal metrics.",
        time: "3:09 PM",
        isSelf: false
      }
    ],
    sharedFiles: [
      {
        type: "Documents",
        filesCount: 5,
        totalSize: "18MB",
        colorClass: "bg-purple-100 text-purple-600",
        items: [
          { name: "Appraisal_Metric_Report.pdf", size: "4.5 MB", date: "June 14, 2026" }
        ]
      },
      {
        type: "Photos",
        filesCount: 3,
        totalSize: "11MB",
        colorClass: "bg-amber-100 text-amber-600",
        items: []
      },
      {
        type: "Movies",
        filesCount: 0,
        totalSize: "0MB",
        colorClass: "bg-teal-100 text-teal-600",
        items: []
      },
      {
        type: "Other",
        filesCount: 1,
        totalSize: "5MB",
        colorClass: "bg-rose-100 text-rose-600",
        items: []
      }
    ]
  },
  {
    id: "jeroen",
    name: "Jeroen Zoet",
    type: "direct",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
    statusText: "We need to start a new re...",
    membersCount: 2,
    filesCount: 18,
    linksCount: 12,
    messages: [
      {
        id: "jer1",
        senderName: "Jeroen Zoet",
        senderAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
        text: "We need to start a new registration cycle for the residential plots. People are waiting.",
        time: "2:09 PM",
        isSelf: false
      }
    ],
    sharedFiles: [
      {
        type: "Documents",
        filesCount: 10,
        totalSize: "44MB",
        colorClass: "bg-purple-100 text-purple-600",
        items: [
          { name: "Cycle_Registration_Plan.pdf", size: "3.2 MB", date: "June 14, 2026" }
        ]
      },
      {
        type: "Photos",
        filesCount: 5,
        totalSize: "18MB",
        colorClass: "bg-amber-100 text-amber-600",
        items: []
      },
      {
        type: "Movies",
        filesCount: 1,
        totalSize: "15MB",
        colorClass: "bg-teal-100 text-teal-600",
        items: []
      },
      {
        type: "Other",
        filesCount: 2,
        totalSize: "8MB",
        colorClass: "bg-rose-100 text-rose-600",
        items: []
      }
    ]
  }
];

export const GROUP_PARTICIPANTS: Participant[] = [
  { name: "Jontray Arnold (You)", role: "Broker / Creator", avatar: "/src/assets/images/jontray_arnold_avatar_1781438623117.jpg", isOnline: true },
  { name: "Evan Scott", role: "Investor Partner", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80", isOnline: true },
  { name: "Kate Johnson", role: "Design Consultant", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80", isOnline: true },
  { name: "Robert", role: "Architect Leader", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80", isOnline: true },
  { name: "Joshua Clarkson", role: "Valuation Lead", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80", isOnline: true },
  { name: "Jeroen Zoet", role: "Legal & Notary", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80", isOnline: true },
  { name: "Tamara Shevchenko", role: "Public Relations", avatar: "", isOnline: true },
  { name: "Sarah Miller", role: "Finance Officer", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80", isOnline: false },
  { name: "Michael Chang", role: "Contractor Director", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80", isOnline: false },
  { name: "Elena Rostova", role: "Property Assessor", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80", isOnline: false },
];
