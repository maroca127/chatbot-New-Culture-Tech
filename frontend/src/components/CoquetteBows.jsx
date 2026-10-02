import React, { useEffect, useRef } from 'react';

/**
 * CoquetteBows Component
 * Renderiza laços bonitinhos estilo coquette em tons de rosa,
 * caindo suavemente em movimento de zigue-zague contínuo em loop.
 */
export default function CoquetteBows() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Paleta de tons de rosa estilo Coquette que harmonizam com o azul e roxo
    const pinkPalettes = [
      { fill: 'rgba(251, 207, 232, ', stroke: 'rgba(244, 114, 182, ', glow: 'rgba(244, 114, 182, 0.4)' }, // Pastel Blush (#fbcfe8)
      { fill: 'rgba(249, 168, 212, ', stroke: 'rgba(236, 72, 153, ', glow: 'rgba(236, 72, 153, 0.4)' },  // Fairy Baby Pink (#f9a8d4)
      { fill: 'rgba(253, 164, 175, ', stroke: 'rgba(244, 63, 94, ', glow: 'rgba(253, 164, 175, 0.4)' },   // Soft Rose (#fda4af)
      { fill: 'rgba(245, 208, 254, ', stroke: 'rgba(217, 70, 239, ', glow: 'rgba(217, 70, 239, 0.35)' }, // Pink-Lilac Coquette (#f5d0fe)
      { fill: 'rgba(254, 205, 211, ', stroke: 'rgba(251, 113, 133, ', glow: 'rgba(254, 205, 211, 0.4)' }  // Cotton Candy Pink (#fecdd3)
    ];

    // Quantidade balanceada de laços para visual limpo e fluido
    const bowCount = Math.min(Math.floor((width * height) / 38000), 28);
    // Pequenos brilhos/fairy sparkles complementares
    const sparkleCount = Math.min(Math.floor((width * height) / 32000), 32);

    const createBow = (initialY = null) => {
      const palette = pinkPalettes[Math.floor(Math.random() * pinkPalettes.length)];
      const scale = Math.random() * 0.45 + 0.55; // Escala entre 0.55 e 1.0 (laços delicados)
      return {
        x: Math.random() * width,
        y: initialY !== null ? initialY : Math.random() * (height + 100) - 50,
        scale,
        speedY: Math.random() * 0.65 + 0.45, // Velocidade de descida suave
        angle: Math.random() * Math.PI * 2, // Ângulo para a oscilação zigue-zague
        zigzagSpeed: Math.random() * 0.025 + 0.018, // Frequência do zigue-zague
        zigzagAmp: Math.random() * 2.2 + 1.4, // Amplitude do zigue-zague horizontal
        rotationFactor: Math.random() * 0.35 + 0.2, // Inclinação natural ao balançar
        opacity: Math.random() * 0.35 + 0.55, // Opacidade entre 0.55 e 0.90
        palette
      };
    };

    const createSparkle = (initialY = null) => {
      return {
        x: Math.random() * width,
        y: initialY !== null ? initialY : Math.random() * height,
        radius: Math.random() * 1.5 + 0.8,
        speedY: Math.random() * 0.5 + 0.25,
        angle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.01,
        opacity: Math.random() * 0.4 + 0.3
      };
    };

    const bows = Array.from({ length: bowCount }, () => createBow());
    const sparkles = Array.from({ length: sparkleCount }, () => createSparkle());

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    /**
     * Desenha um Laço Coquette com fita, dobras e caudas esvoaçantes
     */
    const drawBow = (ctx, x, y, scale, rotation, palette, opacity) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      const fillStyle = `${palette.fill}${opacity})`;
      const strokeStyle = `${palette.stroke}${opacity * 0.85})`;
      const detailStroke = `${palette.stroke}${opacity * 0.5})`;

      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Sombra e brilho suave
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 8 * scale;

      // 1. Cauda Esquerda da Fita (Left Ribbon Tail)
      ctx.beginPath();
      ctx.moveTo(-3, 3);
      ctx.bezierCurveTo(-7, 14, -14, 22, -15, 34);
      ctx.lineTo(-8, 32);
      ctx.bezierCurveTo(-6, 20, -2, 13, 0, 4);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();

      // 2. Cauda Direita da Fita (Right Ribbon Tail)
      ctx.beginPath();
      ctx.moveTo(3, 3);
      ctx.bezierCurveTo(7, 14, 14, 22, 15, 34);
      ctx.lineTo(8, 32);
      ctx.bezierCurveTo(6, 20, 2, 13, 0, 4);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();

      // 3. Laço Esquerdo (Left Loop)
      ctx.beginPath();
      ctx.moveTo(-2, -1);
      ctx.bezierCurveTo(-15, -19, -27, -7, -24, 4);
      ctx.bezierCurveTo(-22, 11, -9, 10, -2, 2);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();

      // Dobra interna esquerda (detalhe de profundidade)
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.bezierCurveTo(-14, -6, -18, 0, -11, 4);
      ctx.strokeStyle = detailStroke;
      ctx.stroke();

      // 4. Laço Direito (Right Loop)
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.bezierCurveTo(15, -19, 27, -7, 24, 4);
      ctx.bezierCurveTo(22, 11, 9, 10, 2, 2);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();

      // Dobra interna direita (detalhe de profundidade)
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.bezierCurveTo(14, -6, 18, 0, 11, 4);
      ctx.strokeStyle = detailStroke;
      ctx.stroke();

      // 5. Nó Central do Laço (Center Ribbon Knot)
      ctx.beginPath();
      ctx.ellipse(0, 1, 4.5, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();

      // Ponto de luz perolado no nó
      ctx.beginPath();
      ctx.arc(-1, -0.5, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
      ctx.fill();

      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Renderiza sparkles suaves ao fundo
      sparkles.forEach((s) => {
        s.angle += s.swaySpeed;
        s.y += s.speedY;
        s.x += Math.sin(s.angle) * 0.4;

        if (s.y > height + 10) {
          s.y = -10;
          s.x = Math.random() * width;
        }

        const currentOpacity = Math.max(0.1, s.opacity + Math.sin(s.angle * 2) * 0.15);
        ctx.beginPath();
        ctx.fillStyle = `rgba(251, 207, 232, ${currentOpacity})`;
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Renderiza e anima os laços em movimento de zigue-zague contínuo
      bows.forEach((b) => {
        b.angle += b.zigzagSpeed;
        b.y += b.speedY;
        // Movimento horizontal de zigue-zague contínuo
        b.x += Math.sin(b.angle) * b.zigzagAmp;

        // Rotação dinâmica inclinando para o lado do zigue-zague (efeito esvoaçante)
        const currentRotation = Math.cos(b.angle) * b.rotationFactor;

        // Loop contínuo: quando passa do fim da tela, reaparece no topo
        if (b.y > height + 45) {
          b.y = -45;
          b.x = Math.random() * width;
          b.angle = Math.random() * Math.PI * 2;
        }
        if (b.x > width + 45) b.x = -45;
        if (b.x < -45) b.x = width + 45;

        drawBow(ctx, b.x, b.y, b.scale, currentRotation, b.palette, b.opacity);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="coquette-bows-canvas"
      aria-hidden="true"
    />
  );
}
