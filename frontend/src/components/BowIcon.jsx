import React from 'react';

/**
 * BowIcon Component
 * Ícone vetorial de Laço de Fita no estilo Coquette em tons de rosa.
 *
 * @param {Object} props
 * @param {number} [props.size=24] - Largura e altura do ícone em pixels
 * @param {string} [props.className=''] - Classes CSS adicionais
 */
export default function BowIcon({ size = 24, className = '', ...props }) {
  // ID único para evitar conflito de gradientes caso renderizado múltiplas vezes
  const gradId = 'coquette-bow-grad';
  const knotId = 'coquette-knot-grad';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`coquette-bow-icon ${className}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="2" y1="4" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbcfe8" />
          <stop offset="45%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={knotId} x1="10" y1="9" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fbcfe8" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <filter id="bow-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#f472b6" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#bow-glow)">
        {/* Cauda Esquerda da Fita */}
        <path
          d="M10.8 12.8C9.2 16.2 6.8 19.5 4.5 21.5L7.2 20.2C8.8 17.5 10.2 14.5 11.2 12.8Z"
          fill={`url(#${gradId})`}
          stroke="#db2777"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Cauda Direita da Fita */}
        <path
          d="M13.2 12.8C14.8 16.2 17.2 19.5 19.5 21.5L16.8 20.2C15.2 17.5 13.8 14.5 12.8 12.8Z"
          fill={`url(#${gradId})`}
          stroke="#db2777"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Laço Esquerdo */}
        <path
          d="M11 11.2C6.8 4.2 2.2 7.8 2.2 11.2C2.2 14.2 6.2 14.5 11 12.2Z"
          fill={`url(#${gradId})`}
          stroke="#db2777"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Dobra interna esquerda */}
        <path
          d="M9.2 11.2C7.2 9.6 5.2 10.2 4.6 11.8"
          stroke="#fdf2f8"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* Laço Direito */}
        <path
          d="M13 11.2C17.2 4.2 21.8 7.8 21.8 11.2C21.8 14.2 17.8 14.5 13 12.2Z"
          fill={`url(#${gradId})`}
          stroke="#db2777"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Dobra interna direita */}
        <path
          d="M14.8 11.2C16.8 9.6 18.8 10.2 19.4 11.8"
          stroke="#fdf2f8"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* Nó Central */}
        <ellipse
          cx="12"
          cy="11.6"
          rx="2.5"
          ry="2.3"
          fill={`url(#${knotId})`}
          stroke="#db2777"
          strokeWidth="0.8"
        />

        {/* Ponto de Brilho Perolado no Nó */}
        <circle cx="11.2" cy="10.8" r="0.6" fill="#ffffff" />
      </g>
    </svg>
  );
}
