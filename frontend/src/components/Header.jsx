import React from 'react';
import { Sparkles, Sun, Moon, Download, BarChart3, RotateCcw } from 'lucide-react';
import BowIcon from './BowIcon';

/**
 * Header Component (Prompt 10)
 * Cabeçalho institucional com logotipo "Bias Flow", identificação do curso de IA,
 * indicador pulsante de status de conexão com a API (online/offline) e botões de ação.
 *
 * @param {Object} props
 * @param {boolean} props.isApiOnline - Status da conexão com a API backend.
 * @param {string} props.theme - Tema atual ('dark' ou 'light').
 * @param {Function} props.onToggleTheme - Função para alternar entre tema claro e escuro.
 * @param {Function} [props.onExportChat] - Função para exportar o histórico de mensagens.
 * @param {Function} [props.onOpenMetrics] - Função para abrir o painel de métricas.
 * @param {Function} [props.onClearChat] - Função para reiniciar a conversa.
 */
export default function Header({
  isApiOnline = false,
  theme = 'dark',
  onToggleTheme,
  onExportChat,
  onOpenMetrics,
  onClearChat
}) {
  return (
    <header className="chat-header">
      <div className="brand-wrapper">
        <div className="brand-icon-container">
          <BowIcon size={26} />
        </div>
        <div className="brand-info">
          <h1>Neo Culture Tech</h1>
          <p>
            <Sparkles size={13} style={{ color: 'var(--color-brand-pink)' }} />
            K-Pop Community & Music AI
          </p>
        </div>
      </div>

      <div className="header-actions">
        {/* Status da API */}
        <div
          className="status-badge"
          title={isApiOnline ? 'API Conectada e Online' : 'API Desconectada ou Inacessível'}
        >
          <span className={`status-dot ${isApiOnline ? 'online' : 'offline'}`} />
          <span className="status-text">{isApiOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Toggle Tema Claro / Escuro */}
        {onToggleTheme && (
          <button
            type="button"
            className={`header-btn theme-toggle-btn ${theme === 'light' ? 'theme-light-active' : ''}`}
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        )}

        {/* Botão de Exportar Histórico (.txt) */}
        {onExportChat && (
          <button
            type="button"
            className="header-btn"
            onClick={onExportChat}
            title="Exportar Histórico do Atendimento (.txt)"
            aria-label="Exportar Log"
          >
            <Download size={17} />
          </button>
        )}

        {/* Botão de Painel de Métricas */}
        {onOpenMetrics && (
          <button
            type="button"
            className="header-btn"
            onClick={onOpenMetrics}
            title="Visualizar Métricas Detalhadas"
            aria-label="Métricas"
          >
            <BarChart3 size={17} />
          </button>
        )}

        {/* Botão de Limpar / Reiniciar Chat */}
        {onClearChat && (
          <button
            type="button"
            className="header-btn"
            onClick={onClearChat}
            title="Reiniciar Conversa"
            aria-label="Reiniciar Chat"
          >
            <RotateCcw size={17} />
          </button>
        )}
      </div>
    </header>
  );
}
