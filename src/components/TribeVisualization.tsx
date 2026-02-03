"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/lib/theme";

interface TribeVisualizationProps {
  memberCount: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  opacity: number;
  connections: number[];
}

export function TribeVisualization({ memberCount }: TribeVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, isOver: false });
  const rotationRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const { theme } = useTheme();
  
  const isLight = theme === 'light';

  // Generate particles based on member count
  const generateParticles = useCallback((count: number): Particle[] => {
    const particles: Particle[] = [];
    // Scale particle count - more members = more particles, but cap it
    const particleCount = Math.min(Math.max(count, 20), 400);
    
    for (let i = 0; i < particleCount; i++) {
      // Distribute points on a sphere using golden spiral
      const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      // Add some randomness to radius for organic feel
      const radius = 0.7 + Math.random() * 0.3;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      // Generate connections to nearby particles
      const connections: number[] = [];
      if (i > 0 && Math.random() > 0.7) {
        const connectTo = Math.floor(Math.random() * i);
        connections.push(connectTo);
      }
      
      particles.push({
        x, y, z,
        baseX: x,
        baseY: y,
        baseZ: z,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        connections,
      });
    }
    
    return particles;
  }, []);

  // Rotate a point around Y and X axis
  const rotatePoint = useCallback((x: number, y: number, z: number, rotX: number, rotY: number) => {
    // Rotate around Y axis
    let newX = x * Math.cos(rotY) - z * Math.sin(rotY);
    let newZ = x * Math.sin(rotY) + z * Math.cos(rotY);
    
    // Rotate around X axis
    const newY = y * Math.cos(rotX) - newZ * Math.sin(rotX);
    newZ = y * Math.sin(rotX) + newZ * Math.cos(rotX);
    
    return { x: newX, y: newY, z: newZ };
  }, []);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Update canvas size
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.35;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Update rotation based on mouse
    if (mouseRef.current.isOver) {
      rotationRef.current.targetY = (mouseRef.current.x - centerX) * 0.003;
      rotationRef.current.targetX = (mouseRef.current.y - centerY) * 0.002;
    } else {
      // Ambient rotation
      const time = Date.now() * 0.0002;
      rotationRef.current.targetY = Math.sin(time) * 0.5;
      rotationRef.current.targetX = Math.cos(time * 0.7) * 0.2;
    }
    
    // Smooth rotation
    rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * 0.05;
    rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.05;
    
    const rotX = rotationRef.current.x;
    const rotY = rotationRef.current.y;
    
    // Transform and sort particles by depth
    const transformedParticles = particlesRef.current.map((p, i) => {
      // Add subtle floating animation
      const time = Date.now() * 0.001;
      const floatX = p.baseX + Math.sin(time + i * 0.1) * 0.02;
      const floatY = p.baseY + Math.cos(time * 0.8 + i * 0.1) * 0.02;
      const floatZ = p.baseZ + Math.sin(time * 0.6 + i * 0.1) * 0.02;
      
      const rotated = rotatePoint(floatX, floatY, floatZ, rotX, rotY);
      return {
        ...p,
        index: i,
        screenX: centerX + rotated.x * scale,
        screenY: centerY + rotated.y * scale,
        depth: rotated.z,
      };
    }).sort((a, b) => a.depth - b.depth);
    
    // Draw connections first (behind particles)
    const baseColor = isLight ? '0, 0, 0' : '255, 255, 255';
    
    ctx.lineWidth = 0.5;
    transformedParticles.forEach(p => {
      p.connections.forEach(targetIdx => {
        const target = transformedParticles.find(t => t.index === targetIdx);
        if (target) {
          const avgDepth = (p.depth + target.depth) / 2;
          const depthFactor = (avgDepth + 1) / 2;
          const opacity = depthFactor * 0.15;
          
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${baseColor}, ${opacity})`;
          ctx.moveTo(p.screenX, p.screenY);
          ctx.lineTo(target.screenX, target.screenY);
          ctx.stroke();
        }
      });
    });
    
    // Draw particles
    transformedParticles.forEach(p => {
      const depthFactor = (p.depth + 1) / 2; // 0 to 1
      const size = p.size * (0.5 + depthFactor * 0.8);
      const opacity = p.opacity * (0.2 + depthFactor * 0.8);
      
      ctx.beginPath();
      ctx.arc(p.screenX, p.screenY, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${baseColor}, ${opacity})`;
      ctx.fill();
    });
    
    // Draw central "You" node
    const youRotated = rotatePoint(0, 0, 0, rotX, rotY);
    const youX = centerX + youRotated.x * scale;
    const youY = centerY + youRotated.y * scale;
    const youDepth = (youRotated.z + 1) / 2;
    
    // You node glow
    const glowGradient = ctx.createRadialGradient(youX, youY, 0, youX, youY, 20);
    if (isLight) {
      glowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
    ctx.beginPath();
    ctx.arc(youX, youY, 20, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    // You node
    ctx.beginPath();
    ctx.arc(youX, youY, 6, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? `rgba(0, 0, 0, ${0.6 + youDepth * 0.4})` : `rgba(255, 255, 255, ${0.6 + youDepth * 0.4})`;
    ctx.fill();
    
    // Arrow and "you" label
    const arrowStartX = youX + 25;
    const arrowStartY = youY - 15;
    const arrowEndX = youX + 10;
    const arrowEndY = youY - 5;
    
    // Arrow line
    ctx.beginPath();
    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.moveTo(arrowStartX, arrowStartY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();
    
    // Arrow head
    const angle = Math.atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(arrowEndX - 5 * Math.cos(angle - Math.PI / 6), arrowEndY - 5 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(arrowEndX - 5 * Math.cos(angle + Math.PI / 6), arrowEndY - 5 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    
    // "you" label
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('you', arrowStartX + 5, arrowStartY + 4);
    
    animationRef.current = requestAnimationFrame(render);
  }, [rotatePoint, isLight]);

  // Initialize
  useEffect(() => {
    particlesRef.current = generateParticles(memberCount);
    
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    
    const handleMouseEnter = () => {
      mouseRef.current.isOver = true;
    };
    
    const handleMouseLeave = () => {
      mouseRef.current.isOver = false;
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }
    
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [memberCount, generateParticles, render]);

  // Re-render when theme changes
  useEffect(() => {
    // Force re-render on theme change
  }, [theme]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[280px] mb-6 cursor-grab active:cursor-grabbing"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
