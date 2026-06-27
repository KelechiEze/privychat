import React from 'react';
import { motion } from 'framer-motion';

interface BorderMarqueeProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  thickness?: number;
}

export default function BorderMarquee({ 
  children, 
  color = '#00c5bc',
  speed = 3,
  thickness = 3
}: BorderMarqueeProps) {
  // Calculate the perimeter for the path
  // The path will go around all four sides
  
  return (
    <div className="relative rounded-2xl overflow-hidden p-[3px]">
      {/* Animated border container */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* The animated border gradient */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            padding: `${thickness}px`,
            background: `conic-gradient(
              from 0deg,
              ${color} 0%,
              ${color} 10%,
              transparent 10%,
              transparent 40%,
              ${color} 40%,
              ${color} 50%,
              transparent 50%,
              transparent 80%,
              ${color} 80%,
              ${color} 90%,
              transparent 90%,
              transparent 100%
            )`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Content wrapper */}
        <div className="relative bg-white rounded-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}