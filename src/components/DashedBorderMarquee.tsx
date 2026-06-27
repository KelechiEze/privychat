import React from 'react';
import { motion } from 'framer-motion';

interface DashedBorderMarqueeProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  dashLength?: number;
  gapLength?: number;
}

export default function DashedBorderMarquee({
  children,
  color = '#00c5bc',
  speed = 2,
  dashLength = 20,
  gapLength = 10
}: DashedBorderMarqueeProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden p-[2px]">
      <div className="relative rounded-2xl overflow-hidden bg-white">
        {/* SVG for dashed border animation */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              <stop offset="50%" stopColor="#00ffcc" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
            
            <motion.path
              id="marqueePath"
              d="M 0,0 L 100,0 L 100,100 L 0,100 Z"
              strokeWidth="2"
              stroke="url(#gradient)"
              fill="none"
              strokeDasharray={`${dashLength} ${gapLength}`}
              animate={{
                strokeDashoffset: [-dashLength - gapLength, 0],
              }}
              transition={{
                duration: speed,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </defs>
          
          {/* The actual animated path */}
          <motion.path
            d="M 4,4 L calc(100% - 4),4 L calc(100% - 4),calc(100% - 4) L 4,calc(100% - 4) Z"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${dashLength} ${gapLength}`}
            animate={{
              strokeDashoffset: [-dashLength - gapLength, 0],
            }}
            transition={{
              duration: speed,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </svg>
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}