import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  pulseSpeed: number;
  pulseOffset: number;
}

export const NeuralGalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Palette harmonized with ResearchOS Dark Canvas & Accents
    const nodeColors = [
      { fill: 'rgba(192, 132, 252, 0.85)', glow: 'rgba(168, 85, 247, 0.5)' }, // Lavender
      { fill: 'rgba(129, 140, 248, 0.85)', glow: 'rgba(99, 102, 241, 0.45)' }, // Indigo
      { fill: 'rgba(56, 189, 248, 0.85)', glow: 'rgba(14, 165, 233, 0.45)' },  // Sky/Cyan
      { fill: 'rgba(255, 255, 255, 0.9)', glow: 'rgba(192, 132, 252, 0.6)' },  // Bright Core Hub
    ];

    const nodes: Node[] = [];
    const MAX_DISTANCE = 145; // Max distance for drawing connecting constellation lines
    const mouse = { x: -1000, y: -1000, active: false };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Re-populate nodes based on screen real estate
      const count = Math.min(Math.floor((width * height) / 13000), 95);
      nodes.length = 0;

      for (let i = 0; i < count; i++) {
        const colorScheme = nodeColors[i % nodeColors.length];
        const isHub = i % 8 === 0;
        const baseRadius = isHub ? Math.random() * 1.5 + 2.2 : Math.random() * 1.2 + 1.2;

        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: baseRadius,
          baseRadius,
          color: colorScheme.fill,
          glowColor: colorScheme.glow,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // 1. Update node positions
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        node.x += node.vx;
        node.y += node.vy;

        // Bounce gently off edges with smooth wrap
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;

        // Gentle mouse repulsion
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120;
            node.x += (dx / dist) * force * 1.2;
            node.y += (dy / dist) * force * 1.2;
          }
        }

        // Pulsing radius for living galaxy feel
        node.radius = node.baseRadius + Math.sin(time * 2 + node.pulseOffset) * 0.4;
      }

      // 2. Draw connecting network lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];

          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.28; // Subtle yet clearly visible

            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);

            // Subtle gradient line between nodes
            const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
            grad.addColorStop(0, `rgba(139, 92, 246, ${alpha})`); // Violet
            grad.addColorStop(0.5, `rgba(99, 102, 241, ${alpha * 1.2})`); // Indigo
            grad.addColorStop(1, `rgba(56, 189, 248, ${alpha})`); // Sky/Cyan

            ctx.strokeStyle = grad;
            ctx.lineWidth = dist < MAX_DISTANCE * 0.4 ? 0.9 : 0.6;
            ctx.stroke();
          }
        }
      }

      // 3. Draw glowing nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Outer glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = node.glowColor;
        ctx.fill();

        // Inner solid core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.glowColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
    >
      {/* Background Deep Cosmic Mesh & Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-600/20 via-indigo-600/15 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-[480px] h-[480px] bg-indigo-600/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-12 left-12 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Living Neural Galaxy Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </motion.div>
  );
};
