import React, { useEffect, useRef } from 'react';

/**
 * SnowParticles Component
 * Renderiza pontinhos suaves caindo no fundo (efeito neve / floating dust)
 * em uma paleta harmoniosa de tons soft azul, anil, lavanda e lilás.
 */
export default function SnowParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Paleta de cores soft em degradê de azul e roxo
    const softColors = [
      { r: 192, g: 132, b: 252 }, // Soft Lilac (#c084fc)
      { r: 216, g: 180, b: 254 }, // Soft Lavender (#d8b4fe)
      { r: 165, g: 180, b: 252 }, // Soft Periwinkle (#a5b4fc)
      { r: 147, g: 197, b: 253 }, // Soft Sky Blue (#93c5fd)
      { r: 186, g: 230, b: 253 }, // Soft Ice Blue (#bae6fd)
      { r: 243, g: 232, b: 255 }  // Soft Star Violet-White (#f3e8ff)
    ];

    // Quantidade de partículas equilibrada para suavidade visual e performance
    const particleCount = Math.min(Math.floor((width * height) / 14000), 90);

    const createParticle = (initialY = null) => {
      const colorObj = softColors[Math.floor(Math.random() * softColors.length)];
      const radius = Math.random() * 2.4 + 1.1; // 1.1px a 3.5px
      return {
        x: Math.random() * width,
        y: initialY !== null ? initialY : Math.random() * height,
        radius,
        baseRadius: radius,
        speedY: Math.random() * 0.75 + 0.35, // Velocidade de descida suave
        speedX: (Math.random() - 0.5) * 0.25,
        angle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.015 + 0.008,
        swayAmplitude: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.5 + 0.25,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        color: colorObj
      };
    };

    const particles = Array.from({ length: particleCount }, () => createParticle());

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Atualiza ângulo de oscilação horizontal (movimento suave de floco)
        p.angle += p.swaySpeed;
        p.y += p.speedY;
        p.x += Math.sin(p.angle) * p.swayAmplitude + p.speedX;

        // Pulsação sutil de opacidade
        const dynamicOpacity = Math.max(
          0.15,
          Math.min(0.85, p.opacity + Math.sin(p.angle * 1.5) * 0.15)
        );

        // Se sair da tela na parte inferior ou laterais, recicla no topo
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width + 10) p.x = -10;
        if (p.x < -10) p.x = width + 10;

        // Desenha o pontinho brilhante com gradiente radial suave
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.radius * 1.8
        );
        gradient.addColorStop(
          0,
          `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${dynamicOpacity})`
        );
        gradient.addColorStop(
          0.6,
          `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${dynamicOpacity * 0.4})`
        );
        gradient.addColorStop(
          1,
          `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`
        );

        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo mais nítido do ponto
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${dynamicOpacity * 0.85})`;
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
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
      className="snow-particles-canvas"
      aria-hidden="true"
    />
  );
}
