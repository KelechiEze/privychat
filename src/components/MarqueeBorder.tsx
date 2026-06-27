import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface MarqueeBorderProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  thickness?: number;
  glowIntensity?: number;
}

export default function MarqueeBorder({
  children,
  color = '#00c5bc',
  speed = 4,
  thickness = 3,
  glowIntensity = 20
}: MarqueeBorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      borderColor: [color, '#00ffcc', '#00c5bc', color],
      boxShadow: [
        `0 0 0px ${color}44, 0 0 0px ${color}33`,
        `0 0 ${glowIntensity}px ${color}66, 0 0 ${glowIntensity * 2}px ${color}44`,
        `0 0 ${glowIntensity}px ${color}66, 0 0 ${glowIntensity * 2}px ${color}44`,
        `0 0 0px ${color}44, 0 0 0px ${color}33`,
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
  }, [color, glowIntensity]);

  return (
    <div className="relative rounded-2xl overflow-hidden p-[2px] w-full h-full max-w-7xl max-h-[850px]">
      {/* Animated gradient border - Main train effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          padding: `${thickness}px`,
          background: `conic-gradient(
            from 0deg,
            ${color}00 0%,
            ${color} 10%,
            ${color} 20%,
            ${color}00 30%,
            ${color}00 40%,
            ${color} 50%,
            ${color} 60%,
            ${color}00 70%,
            ${color}00 80%,
            ${color} 90%,
            ${color}00 100%
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
      
      {/* Second layer for glow effect - The "train" glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          padding: `${thickness + 4}px`,
          background: `conic-gradient(
            from 0deg,
            ${color}00 0%,
            ${color}22 15%,
            ${color}44 25%,
            ${color}22 35%,
            ${color}00 45%,
            ${color}00 55%,
            ${color}22 65%,
            ${color}44 75%,
            ${color}22 85%,
            ${color}00 100%
          )`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          filter: 'blur(12px)',
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: speed * 1.1,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Third layer for extra sparkle */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          padding: `${thickness + 8}px`,
          background: `conic-gradient(
            from 0deg,
            ${color}00 0%,
            ${color}11 20%,
            ${color}33 30%,
            ${color}11 40%,
            ${color}00 50%,
            ${color}00 60%,
            ${color}11 70%,
            ${color}33 80%,
            ${color}11 90%,
            ${color}00 100%
          )`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          filter: 'blur(18px)',
        }}
        animate={{
          rotate: -360,
        }}
        transition={{
          duration: speed * 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Content wrapper with pulsing glow */}
      <motion.div
        ref={containerRef}
        className="relative bg-white rounded-2xl overflow-hidden w-full h-full"
        animate={controls}
        style={{
          borderColor: color,
          boxShadow: `0 0 0px ${color}44`,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}