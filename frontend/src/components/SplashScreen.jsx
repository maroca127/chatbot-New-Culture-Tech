import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const APP_NAME = 'Neo Culture Tech';

/**
 * SplashScreen — Vinheta de abertura com Fade In + GSAP Rolling Text
 * Mantém a paleta de cores original do projeto (tons soft pastel de azul, roxo, lilás e rosa).
 */
export default function SplashScreen({ onFinish }) {
  const splashRef = useRef(null);
  const charsTrackRef = useRef([]);
  const [phase, setPhase] = useState('fadein'); // 'fadein' | 'rolling' | 'fadeout'

  const chars = APP_NAME.split('');

  useEffect(() => {
    charsTrackRef.current = charsTrackRef.current.slice(0, chars.length);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Após a rolagem e brilho, aguarda breve pausa e faz fade out
          setTimeout(() => {
            setPhase('fadeout');
            setTimeout(onFinish, 600);
          }, 1000);
        }
      });

      // 1. Animação de Fade In Inicial da Vinheta
      tl.fromTo(
        splashRef.current,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }
      );

      tl.fromTo(
        '.splash-subtitle',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.4'
      );

      tl.fromTo(
        '.splash-tagline',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.3'
      );

      // 2. Efeito Rolling Text (GSAP) letra por letra com Stagger
      charsTrackRef.current.forEach((trackEl, idx) => {
        if (trackEl) {
          tl.to(
            trackEl,
            {
              yPercent: -50,
              duration: 0.7,
              ease: 'power3.inOut'
            },
            idx === 0 ? '+=0.1' : `-=${0.7 - 0.055}` // Stagger fluido
          );
        }
      });

      // 3. Efeito de brilho pulsante nos caracteres após a rolagem
      tl.to(
        '.splash-title',
        {
          filter: 'drop-shadow(0 0 25px rgba(192, 132, 252, 0.95)) drop-shadow(0 0 45px rgba(96, 165, 250, 0.7))',
          duration: 0.6,
          repeat: 1,
          yoyo: true,
          ease: 'power1.inOut'
        },
        '+=0.1'
      );
    }, splashRef);

    return () => ctx.revert();
  }, [onFinish, chars.length]);

  const handleSkip = () => {
    setPhase('fadeout');
    setTimeout(onFinish, 300);
  };

  return (
    <div
      ref={splashRef}
      className={`splash-screen ${phase === 'fadeout' ? 'splash-fadeout' : 'splash-fadein'}`}
    >
      {/* Botão de Pular Vinheta */}
      <button type="button" className="splash-skip-btn" onClick={handleSkip} title="Pular vinheta">
        Pular ➔
      </button>

      {/* Efeitos decorativos de fundo com cores originais */}
      <div className="splash-glow-orb orb-1" aria-hidden="true" />
      <div className="splash-glow-orb orb-2" aria-hidden="true" />
      <div className="splash-bows-left" aria-hidden="true">🎀</div>
      <div className="splash-bows-right" aria-hidden="true">🎀</div>

      <div className="splash-content">
        {/* Subtítulo */}
        <p className="splash-subtitle">Bem-vindo ao futuro com</p>

        {/* Nome com Efeito Rolling Text GSAP */}
        <h1 className="splash-title" aria-label={APP_NAME}>
          {chars.map((char, idx) => (
            <span
              key={idx}
              className={`rolling-char-box ${char === ' ' ? 'char-space' : ''}`}
            >
              <span
                className="rolling-char-track"
                ref={(el) => (charsTrackRef.current[idx] = el)}
              >
                {/* Linha 1 (Início) */}
                <span className="char-item top-char">
                  {char === ' ' ? '\u00A0' : char}
                </span>
                {/* Linha 2 (Fim da Rolagem) */}
                <span className="char-item bottom-char">
                  {char === ' ' ? '\u00A0' : char}
                </span>
              </span>
            </span>
          ))}
        </h1>

        {/* Tagline do Chatbot */}
        <p className="splash-tagline">
          Assistente Inteligente & Inovação Digital
          <span className="tagline-bow">🎀</span>
        </p>

        {/* Barra de progresso da vinheta */}
        <div className="splash-progress-bar">
          <div className="splash-progress-fill" />
        </div>
      </div>
    </div>
  );
}
