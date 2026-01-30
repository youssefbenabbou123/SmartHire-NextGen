'use client';

import React, { useEffect, useRef } from 'react';

interface AuroraProps {
  colorStops?: string[];
  speed?: number;
  blur?: number;
}

const Aurora: React.FC<AuroraProps> = ({
  colorStops = ['#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'],
  speed = 0.02,
  blur = 80
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const blobsRef = useRef<any[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Only initialize blobs once
    if (!initializedRef.current || blobsRef.current.length === 0) {
      blobsRef.current = colorStops.map((color, i) => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 200 + 150,
        color,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        offset: i * (Math.PI / 2)
      }));
      initializedRef.current = true;
    }

    const blobs = blobsRef.current;

    const animate = () => {
      if (speed === 0) {
        // Static render - draw once and stop
        ctx.fillStyle = 'rgba(18, 2, 44, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        blobs.forEach((blob) => {
          const gradient = ctx.createRadialGradient(
            blob.x, blob.y, 0,
            blob.x, blob.y, blob.radius
          );
          gradient.addColorStop(0, blob.color + '60');
          gradient.addColorStop(0.5, blob.color + '30');
          gradient.addColorStop(1, blob.color + '00');

          ctx.beginPath();
          ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        });
        return; // Don't continue animation loop
      }

      timeRef.current += speed;
      
      ctx.fillStyle = 'rgba(18, 2, 44, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob, i) => {
        // Smooth flowing motion
        blob.x += Math.sin(timeRef.current + blob.offset) * 1.5;
        blob.y += Math.cos(timeRef.current * 0.8 + blob.offset) * 1.2;

        // Wrap around edges
        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        // Pulsating radius
        const pulseRadius = blob.radius + Math.sin(timeRef.current * 2 + i) * 30;

        // Draw gradient blob
        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, pulseRadius
        );
        gradient.addColorStop(0, blob.color + '60');
        gradient.addColorStop(0.5, blob.color + '30');
        gradient.addColorStop(1, blob.color + '00');

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [colorStops, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ filter: `blur(${blur}px)` }}
    />
  );
};

export default Aurora;
