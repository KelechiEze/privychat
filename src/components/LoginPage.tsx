import React, { useState, useEffect } from 'react';
import { 
  Shield, MessageSquare, ArrowRight, Eye, EyeOff, Key, User, 
  Sparkles, CheckCircle2, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

interface LoginPageProps {
  onLoginSuccess: (username: string, userData: any) => void;
}

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  accent: string;
}

const CAROUSEL_SLIDES: Slide[] = [
  {
    image: '/dr1.jpg',
    title: 'Absolute Privacy Crypt',
    subtitle: 'Zero-knowledge protocols and offline-first encryption safeguarding every direct and group message thread.',
    accent: 'from-[#00c5bc] to-teal-400'
  },
  {
    image: 'dr2.jpg',
    title: 'Precision Workspaces',
    subtitle: 'High-fidelity galleries, immediate WebRTC video/audio feeds, and real-time residential asset checklists.',
    accent: 'from-purple-500 to-indigo-500'
  },
  {
    image: 'dr3.jpg',
    title: 'Granular Thread Control',
    subtitle: 'Instantly archive conversation lists, mute feeds, mark logs completely read, or permanently reset local databases.',
    accent: 'from-blue-500 to-[#00c5bc]'
  },
  {
    image: 'dr4.jpg',
    title: 'Colleague Direct Drops',
    subtitle: 'Sync with online specialists instantly, configure dedicated folders, and trigger automated message receipts.',
    accent: 'from-[#00c5bc] to-emerald-400'
  }
];

// Pre-defined user accounts for Debbie and KC with their UIDs
const VALID_USERS = {
  'debbie@aurachat.com': {
    name: 'Debbie',
    displayName: 'Debbie',
    uid: 'XwZ7AfyJ6Mfbh4L5rSreRwCqrIy1',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    role: 'Team Member'
  },
  'kc@aurachat.com': {
    name: 'KC',
    displayName: 'KC',
    uid: 'ms6jNjevzJRLsnO2MIFOZY8dH8e2',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    role: 'Team Member'
  }
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(slideTimer);
  }, []);

  const getEmailFromUsername = (name: string): string => {
    const cleanName = name.toLowerCase().trim().replace(/\s+/g, '.');
    return `${cleanName}@aurachat.com`;
  };

  // PERMANENT FIX: Auto-create/update user profile in Firestore with online status
  const ensureUserProfile = async (uid: string, email: string, displayName: string, avatar: string, role: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      const userData = {
        uid: uid,
        email: email,
        displayName: displayName,
        fullName: displayName,
        firstName: displayName.split(' ')[0] || displayName,
        lastName: displayName.split(' ')[1] || '',
        avatar: avatar,
        role: role,
        isOnline: true,  // Add online status
        lastSeen: serverTimestamp(),  // Add last seen
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (!userDoc.exists()) {
        // Create new profile with createdAt
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp()
        });
        console.log(`✅ Created user profile for: ${displayName}`);
      } else {
        // Update existing profile
        await setDoc(userRef, {
          ...userData,
          createdAt: userDoc.data().createdAt || serverTimestamp()
        }, { merge: true });
        console.log(`✅ Updated user profile for: ${displayName}`);
      }
      
      return true;
    } catch (error) {
      console.error("Error ensuring user profile:", error);
      return false;
    }
  };

  // PERMANENT FIX: Create userChats document structure for chat functionality
  const ensureUserChatsStructure = async (uid: string) => {
    try {
      // Create the userChats document if it doesn't exist
      const userChatsRef = doc(db, 'userChats', uid);
      const userChatsDoc = await getDoc(userChatsRef);
      
      if (!userChatsDoc.exists()) {
        await setDoc(userChatsRef, {
          uid: uid,
          chats: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Created userChats structure for: ${uid}`);
      }
      
      return true;
    } catch (error) {
      console.error("Error ensuring userChats structure:", error);
      return false;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please provide a secure username to initiate session.');
      return;
    }
    if (!password) {
      setErrorMessage('Please type your workspace passcode.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const email = getEmailFromUsername(username);
      console.log("Attempting login with email:", email);
      
      // Check if this is an authorized user (Debbie or KC)
      const userInfo = VALID_USERS[email as keyof typeof VALID_USERS];
      if (!userInfo) {
        setErrorMessage('Access restricted. Only authorized team members can access this workspace.');
        setIsSubmitting(false);
        return;
      }

      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User logged in:", user.uid);
      
      // PERMANENT FIX: Auto-create/update profile in Firestore with online status
      await ensureUserProfile(
        user.uid,
        email,
        userInfo.displayName,
        userInfo.avatar,
        userInfo.role
      );
      
      // PERMANENT FIX: Create userChats structure for chat functionality
      await ensureUserChatsStructure(user.uid);
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: userInfo.displayName,
        photoURL: userInfo.avatar
      });
      
      setSuccess(true);
      setTimeout(() => {
        onLoginSuccess(username.trim(), userInfo);
      }, 800);
      
    } catch (error: any) {
      console.error('Auth error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setErrorMessage('Account not found. Please contact administrator.');
          break;
        case 'auth/wrong-password':
          setErrorMessage('Incorrect passcode. Please try again.');
          break;
        case 'auth/too-many-requests':
          setErrorMessage('Too many failed attempts. Please try again later.');
          break;
        default:
          setErrorMessage(error.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('Debbie');
    setPassword('debbie123');
    setErrorMessage('');
  };

  const handleQuickFillKC = () => {
    setUsername('KC');
    setPassword('kc123');
    setErrorMessage('');
  };

  return (
    <div 
      id="login-wrapper"
      className="w-full h-full flex flex-col md:flex-row bg-white overflow-hidden rounded-none md:rounded-[2rem] shadow-2xl relative select-none animate-fade-in"
    >
      {/* LEFT HALF: THE CAROUSEL SLIDER */}
      <div className="w-full md:w-1/2 h-[260px] md:h-full relative overflow-hidden bg-slate-950 flex flex-col justify-between p-6 md:p-10 text-white shrink-0">
        
        {CAROUSEL_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
              idx === currentSlide 
                ? 'opacity-40 scale-100' 
                : 'opacity-0 scale-105 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/5 to-transparent" />
          </div>
        ))}

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/25">
            <Shield className="w-4 h-4 text-[#00c5bc]" />
            <span className="text-[10px] font-display font-extrabold tracking-[0.2em] text-white">
              AURA<span className="text-[#00c5bc]">CHAT</span>
            </span>
          </div>
          
          <span className="text-[9px] font-mono text-gray-200 bg-white/20 px-2.5 py-1 rounded-md backdrop-blur-xs font-bold uppercase tracking-widest">
            SLIDE 0{currentSlide + 1}
          </span>
        </div>

        <div className="relative z-10 mt-auto">
          {CAROUSEL_SLIDES.map((slide, idx) => (
            <div
              key={idx}
              className={`transition-all duration-750 ease-out ${
                idx === currentSlide 
                  ? 'opacity-100 translate-y-0 block' 
                  : 'opacity-0 translate-y-4 hidden'
              }`}
            >
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r ${slide.accent} text-slate-950 mb-3 shadow-sm`}>
                <Sparkles className="w-2.5 h-2.5" />
                <span>Feature Integration</span>
              </span>
              
              <h2 className="text-base md:text-xl font-display font-extrabold text-white tracking-tight leading-snug drop-shadow-md">
                {slide.title}
              </h2>
              <p className="text-[10.5px] md:text-[11.5px] text-white font-medium mt-2 leading-relaxed max-w-sm drop-shadow-md">
                {slide.subtitle}
              </p>
            </div>
          ))}

          <div className="flex items-center gap-1.5 mt-6">
            {CAROUSEL_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                type="button"
                className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide 
                    ? 'w-6 bg-[#00c5bc]' 
                    : 'w-1.5 bg-white/60 hover:bg-white/90'
                }`}
                title={`Navigate to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT HALF: LOGIN CARD */}
      <div className="flex-1 h-full flex flex-col justify-center p-8 sm:p-12 md:p-16 bg-white relative">
        <div className="absolute top-6 right-6 flex items-center gap-1 hover:opacity-80 transition-all cursor-pointer">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Secure Portal</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          
          <div className="mb-7">
            <h1 className="text-xl md:text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Connect to your private team directory.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#00c5bc] shrink-0" />
              <span>Identity verified. Preparing secure workspace...</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 font-mono select-none">
                Workspace Identity / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Debbie or KC"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-xl border border-gray-150 bg-gray-50 focus:bg-white focus:border-[#00c5bc] focus:ring-3 focus:ring-[#00c5bc]/10 transition-all outline-none text-gray-800 placeholder-gray-400"
                  disabled={isSubmitting || success}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 select-none">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">
                  Access Passcode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="text-[9px] text-[#00c5bc] font-black tracking-wider uppercase hover:underline cursor-pointer"
                  >
                    ⚡ Debbie
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickFillKC}
                    className="text-[9px] text-[#00c5bc] font-black tracking-wider uppercase hover:underline cursor-pointer"
                  >
                    ⚡ KC
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full text-xs font-semibold pl-10 pr-10 py-3 rounded-xl border border-gray-150 bg-gray-50 focus:bg-white focus:border-[#00c5bc] focus:ring-3 focus:ring-[#00c5bc]/10 transition-all outline-none text-gray-800 placeholder-gray-400"
                  disabled={isSubmitting || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  disabled={isSubmitting || success}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || success}
              className="w-full mt-3 py-3 rounded-xl bg-[#00c5bc] hover:bg-[#00b0a8] disabled:bg-gray-200 text-white font-display font-extrabold text-xs tracking-wider uppercase transition-all shadow-md shadow-teal-100 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                  <span>Access Granted</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          <div className="mt-8 border-t border-gray-100 pt-5 text-center">
            <span className="text-[9.5px] text-gray-400 font-medium block">
              Secure workspace with end-to-end encryption.
            </span>
            <span className="text-[8.5px] text-gray-500 font-bold mt-1.5 inline-flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full select-none uppercase tracking-widest font-mono">
              <Zap className="w-2.5 h-2.5 text-[#00c5bc]" /> Powered by Aura Secure Chat
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}