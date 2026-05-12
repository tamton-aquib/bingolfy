import { useRef, useCallback, useEffect } from 'react';

export function useConfetti(canvasId = 'confetti-canvas') {
  const animRef = useRef<number | null>(null);

  const start = useCallback(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#000000', '#ffffff'][Math.random() * 8 | 0],
      vx: Math.random() * 3 - 1.5,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 10 - 5,
    }));

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let alive = 0;
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotSpeed;
        if (p.y < canvas!.height + 20) {
          alive = 1;
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate((p.rotation * Math.PI) / 180);
          ctx!.fillStyle = p.color;
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx!.restore();
        }
      });
      if (alive) animRef.current = requestAnimationFrame(draw);
    }
    draw();
  }, [canvasId]);

  const stop = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasId]);

  useEffect(() => {
    const onResize = () => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [canvasId]);

  return { start, stop };
}
