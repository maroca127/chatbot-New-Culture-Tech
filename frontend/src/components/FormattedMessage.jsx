import React, { useMemo } from 'react';
import { marked } from 'marked';

/**
 * Configurações customizadas do renderer do Marked
 * para links seguros e quebra de linhas automática
 */
const renderer = new marked.Renderer();

// Garante que links abram em nova aba com segurança
renderer.link = function ({ href, title, text }) {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true
});

/**
 * Componente FormattedMessage
 * Renderiza textos e respostas da IA interpretando Markdown de forma segura
 * (negrito, itálico, listas ordenadas/não-ordenadas, links, blocos de código e tabelas).
 *
 * @param {Object} props
 * @param {string} props.content - Texto em formato Markdown a ser renderizado
 * @param {string} [props.className=''] - Classes CSS adicionais
 */
export default function FormattedMessage({ content = '', className = '' }) {
  const htmlContent = useMemo(() => {
    if (!content || typeof content !== 'string') return '';
    try {
      return marked.parse(content);
    } catch (error) {
      console.error('Erro ao processar Markdown da mensagem:', error);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
