import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  RotateCcw,
  BarChart3,
  Download,
  Activity,
  Database,
  Cpu,
  Sun,
  Moon
} from 'lucide-react';
import VoiceInput from './VoiceInput';
import FormattedMessage from './FormattedMessage';
import BowIcon from './BowIcon';
import Header from './Header';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * ChatWindow Component (Prompt 09 & Prompt 10)
 * Janela principal de atendimento inteligente com histórico de mensagens,
 * auto-scroll, integração FastAPI, feedback Like/Dislike, barra de métricas,
 * suporte a voz e exportação do log em .txt.
 */
export default function ChatWindow({ theme = 'dark', onToggleTheme, isApiOnline: isApiOnlineProp }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApiOnline, setIsApiOnline] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState([
    'Quais são os planos e preços da AfesuTech?',
    'Como funciona a integração da API?',
    'Como posso treinar a IA com meus documentos (RAG)?',
    'Qual o horário de atendimento do suporte técnico?'
  ]);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [currentMode, setCurrentMode] = useState('Híbrido (RAG + LLM)');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 8. Auto-scroll suave sempre para a última mensagem usando useRef
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 1 & 2. Inicialização, Checagem da API e Mensagem de Boas-Vindas
  useEffect(() => {
    const checkApiAndLoadData = async () => {
      try {
        const statusRes = await fetch(`${API_BASE_URL}/`);
        if (statusRes.ok) {
          setIsApiOnline(true);
        } else {
          setIsApiOnline(false);
        }

        const kbRes = await fetch(`${API_BASE_URL}/api/knowledge-base`);
        if (kbRes.ok) {
          const kbData = await kbRes.json();
          if (kbData.faq_rapido && kbData.faq_rapido.length > 0) {
            setQuickPrompts(kbData.faq_rapido);
          }
        }
      } catch (err) {
        console.warn('API Offline ou inacessível:', err);
        setIsApiOnline(false);
      }
    };

    checkApiAndLoadData();
    const interval = setInterval(checkApiAndLoadData, 10000);

    // Mensagem de boas-vindas inicial
    const initialGreeting = {
      id: 'msg_welcome',
      role: 'bot',
      text: '👋 Olá! Seja muito bem-vindo(a) ao **Neo Culture Tech**!\n\nSou seu assistente virtual inteligente e estou aqui para tirar suas dúvidas sobre nossos **planos**, **integrações de API**, **treinamento com IA (RAG)** e **suporte técnico**.\n\nComo posso ajudar você hoje? 🎀✨',
      source: 'greeting',
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      feedback: null
    };
    setMessages([initialGreeting]);

    return () => clearInterval(interval);
  }, []);

  // 2. Envio de mensagem para "POST /api/chat"
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const newUserMessage = {
      id: userMsgId,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: query })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      // Atualiza modo dinamicamente baseado na resposta
      if (data.source === 'groq_llm') {
        setCurrentMode('Groq LLM Ativa');
      } else if (data.source === 'knowledge_base_lexical') {
        setCurrentMode('RAG Base Factual');
      }

      const newBotMessage = {
        id: data.message_id || `bot_${Date.now()}`,
        role: 'bot',
        text: data.reply,
        source: data.source,
        confidence: data.confidence,
        timestamp: new Date(data.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        feedback: null
      };

      setMessages((prev) => [...prev, newBotMessage]);

      if (data.suggested_actions && data.suggested_actions.length > 0) {
        setQuickPrompts(data.suggested_actions);
      }
    } catch (err) {
      console.error('Falha ao comunicar com a API do Chatbot:', err);
      const fallbackErrorMsg = {
        id: `bot_err_${Date.now()}`,
        role: 'bot',
        text: '⚠️ Não foi possível conectar ao servidor de IA no momento. Verifique se o backend FastAPI está em execução na porta 8000.',
        source: 'error',
        confidence: 0,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        feedback: null
      };
      setMessages((prev) => [...prev, fallbackErrorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 3. Integração com VoiceInput
  const handleVoiceTranscript = (transcript) => {
    if (transcript) {
      setInputMessage(transcript);
      handleSendMessage(transcript);
    }
  };

  // 5. Botões de Feedback (Like / Dislike) -> "POST /api/feedback"
  const handleSendFeedback = async (messageId, isPositive) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: isPositive ? 'positive' : 'negative' } : msg
      )
    );

    try {
      await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message_id: messageId,
          is_positive: isPositive
        })
      });
    } catch (err) {
      console.warn('Erro ao salvar feedback na API:', err);
    }
  };

  // 7. Botão para exportar o histórico do atendimento em arquivo de texto (.txt)
  const handleExportChat = () => {
    const dataHora = new Date().toLocaleString('pt-BR');
    let logContent = `=================================================================\n`;
    logContent += `         HISTÓRICO DE ATENDIMENTO - NEO CULTURE TECH AI 🎀\n`;
    logContent += `         Data e Hora: ${dataHora}\n`;
    logContent += `         Total de Mensagens: ${messages.length}\n`;
    logContent += `=================================================================\n\n`;

    messages.forEach((msg, idx) => {
      const remetente = msg.role === 'bot' ? '🎀 Neo Culture Tech Assistant' : '👤 Usuário';
      const sourceInfo = msg.source ? ` [Fonte: ${msg.source}]` : '';
      logContent += `[${idx + 1}] ${msg.timestamp} - ${remetente}${sourceInfo}\n`;
      logContent += `${msg.text}\n`;
      if (msg.feedback) {
        logContent += `Feedback do Usuário: ${msg.feedback === 'positive' ? '👍 Útil (Like)' : '👎 Não útil (Dislike)'}\n`;
      }
      logContent += `-----------------------------------------------------------------\n\n`;
    });

    logContent += `Fim do histórico de atendimento.\n`;

    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `atendimento_afesutech_${Date.now()}.txt`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // Síntese de Voz (Text-to-Speech)
  const handleToggleSpeak = (msgId, text) => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta reprodução de áudio por voz.');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/[•🔹🚀💼🏢✨👉📌🎀]/gu, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Carrega métricas consolidadas da API
  const handleOpenMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.warn('Erro ao buscar métricas:', err);
    }
    setShowMetricsModal(true);
  };

  // Limpar conversa
  const handleClearChat = () => {
    window.speechSynthesis?.cancel();
    setSpeakingMessageId(null);
    const initialGreeting = {
      id: `msg_welcome_${Date.now()}`,
      role: 'bot',
      text: '✨ Conversa reiniciada! Como posso te ajudar agora? 🎀',
      source: 'greeting',
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      feedback: null
    };
    setMessages([initialGreeting]);
  };

  // Cálculo da taxa de satisfação rápida
  const satisfactionRate = (() => {
    if (metrics?.taxa_satisfacao_percentual !== undefined) {
      return `${metrics.taxa_satisfacao_percentual}%`;
    }
    const evaluated = messages.filter((m) => m.feedback !== null);
    if (evaluated.length === 0) return '98.5%';
    const positives = evaluated.filter((m) => m.feedback === 'positive').length;
    return `${Math.round((positives / evaluated.length) * 100)}%`;
  })();

  const effectiveApiOnline = isApiOnlineProp !== undefined ? isApiOnlineProp : isApiOnline;

  return (
    <div className="app-container">
      {/* 1. Cabeçalho Principal (Header Component - Prompt 10) */}
      <Header
        isApiOnline={effectiveApiOnline}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onExportChat={handleExportChat}
        onOpenMetrics={handleOpenMetrics}
        onClearChat={handleClearChat}
      />

      {/* 6. Barra de Métricas no Topo (Total Mensagens, Satisfação %, Modo de Operação) */}
      <div className="metrics-topbar">
        <div className="metric-chip">
          <Activity size={13} style={{ color: 'var(--color-brand-cyan)' }} />
          <span>Mensagens:</span>
          <strong>{messages.length}</strong>
        </div>

        <div className="metric-chip">
          <ThumbsUp size={13} style={{ color: 'var(--color-brand-pink)' }} />
          <span>Satisfação:</span>
          <strong className="text-highlight">{satisfactionRate}</strong>
        </div>

        <div className="metric-chip mode-chip">
          {currentMode.includes('Groq') ? (
            <Cpu size={13} style={{ color: 'var(--color-brand-lilac)' }} />
          ) : (
            <Database size={13} style={{ color: 'var(--color-brand-blue)' }} />
          )}
          <span>Modo:</span>
          <strong>{currentMode}</strong>
        </div>
      </div>

      {/* 2. Área de Mensagens (Viewport com Scroll Suave) */}
      <main className="messages-viewport">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.role}`}>
            {/* Avatar */}
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'bot' ? <BowIcon size={20} /> : <User size={20} />}
            </div>

            {/* Conteúdo do Balão */}
            <div className={`message-bubble ${msg.role}`}>
              <FormattedMessage content={msg.text} />

              {/* Metadados da Mensagem */}
              <div className="message-meta">
                <span>{msg.timestamp}</span>
                {msg.role === 'bot' && msg.source && (
                  <span className="meta-tag">
                    {msg.source === 'groq_llm'
                      ? 'Groq LLM'
                      : msg.source === 'knowledge_base_lexical'
                      ? 'Base Factual'
                      : msg.source === 'greeting'
                      ? 'Saudação'
                      : msg.source}
                  </span>
                )}
                {msg.role === 'bot' && msg.confidence !== undefined && (
                  <span className="meta-tag">{Math.round(msg.confidence * 100)}% precisão</span>
                )}
              </div>

              {/* 5. Ações da IA (Ouvir Áudio + Feedback Like/Dislike) */}
              {msg.role === 'bot' && msg.source !== 'error' && (
                <div className="message-actions">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleToggleSpeak(msg.id, msg.text)}
                    title={speakingMessageId === msg.id ? 'Parar leitura' : 'Ouvir resposta (TTS)'}
                  >
                    {speakingMessageId === msg.id ? (
                      <>
                        <VolumeX size={14} style={{ color: 'var(--color-brand-pink)' }} />
                        <span>Parar</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={14} />
                        <span>Ouvir</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${msg.feedback === 'positive' ? 'active-like' : ''}`}
                    onClick={() => handleSendFeedback(msg.id, true)}
                    title="Útil (Like)"
                  >
                    <ThumbsUp size={13} />
                  </button>

                  <button
                    type="button"
                    className={`action-btn ${msg.feedback === 'negative' ? 'active-dislike' : ''}`}
                    onClick={() => handleSendFeedback(msg.id, false)}
                    title="Não foi útil (Dislike)"
                  >
                    <ThumbsDown size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 2. Indicador Visual Animado de Carregamento ("IA digitando...") */}
        {isLoading && (
          <div className="message-row bot">
            <div className="avatar bot">
              <BowIcon size={20} />
            </div>
            <div className="message-bubble bot typing-indicator-container">
              <span className="typing-label">Digitando</span>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 4. Chips de Perguntas Rápidas (FAQ / Suggested Actions) */}
      {quickPrompts && quickPrompts.length > 0 && (
        <div className="quick-prompts-container">
          {quickPrompts.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage(promptText)}
              disabled={isLoading}
            >
              <Sparkles size={13} style={{ color: 'var(--color-brand-pink)' }} />
              <span>{promptText}</span>
            </button>
          ))}
        </div>
      )}

      {/* 3. Barra de Entrada de Texto & Voz */}
      <footer className="chat-input-area">
        <form
          className="input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="chat-text-input"
            placeholder="Digite sua dúvida ou use o microfone..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />

          <div className="input-buttons">
            {/* Componente de Voz */}
            <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />

            {/* Botão de Envio */}
            <button
              type="submit"
              className="send-message-btn"
              disabled={!inputMessage.trim() || isLoading}
              title="Enviar mensagem"
            >
              <Send size={18} />
            </button>
          </div>
        </form>

        <div className="footer-info">
          <span>AfesuTech Soluções Inteligentes © 2026</span>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            Swagger API Docs ↗
          </a>
        </div>
      </footer>

      {/* Modal de Métricas de Atendimento */}
      {showMetricsModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(5, 6, 15, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
            animation: 'fadeInApp 0.2s ease-out'
          }}
          onClick={() => setShowMetricsModal(false)}
        >
          <div
            style={{
              background: 'var(--glass-bg-card)',
              border: '1px solid var(--glass-border)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BarChart3 style={{ color: 'var(--color-brand-pink)' }} />
              Métricas de Atendimento
            </h2>

            {metrics ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ffffff' }}>
                    {metrics.total_atendimentos || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total de Atendimentos</div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f472b6' }}>
                    {metrics.taxa_satisfacao_percentual || 0}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Taxa de Satisfação</div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38bdf8' }}>
                    {metrics.detalhes?.resolvidos_base_conhecimento || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base de Conhecimento</div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#c084fc' }}>
                    {metrics.detalhes?.resolvidos_llm || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Groq LLM</div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Carregando dados da API...</p>
            )}

            <button
              type="button"
              className="quick-prompt-chip"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              onClick={() => setShowMetricsModal(false)}
            >
              Fechar Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
