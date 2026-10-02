import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Componente de Entrada de Voz (Speech-to-Text) com Web Speech API
 * Suporta Desktop e Smartphones (Android via Chrome e iOS via Safari)
 *
 * @param {Object} props
 * @param {function(string): void} props.onTranscript - Callback acionado com o texto transcrito
 * @param {boolean} [props.disabled=false] - Se o botão de microfone está desabilitado
 */
export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Verifica compatibilidade inicial com a Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    // Cleanup ao desmontar componente
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignora erro se já estiver parado
        }
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Exibe mensagem de erro temporária por 4 segundos
  const triggerError = (message) => {
    setErrorMessage(message);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage(null);
    }, 4500);
  };

  const handleToggleListening = () => {
    if (disabled) return;

    // 1. Se já estiver escutando, interrompe
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Erro ao parar gravação:', err);
        }
      }
      setIsListening(false);
      return;
    }

    // 2. Validação de suporte da Web Speech API no navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerError('Reconhecimento de voz ativado! Dica: Utilize o Google Chrome, Microsoft Edge ou Safari para gravar sua voz.');
      return;
    }

    setErrorMessage(null);

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        setIsListening(false);
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript.trim();
          if (transcript && typeof onTranscript === 'function') {
            onTranscript(transcript);
          }
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        console.warn('SpeechRecognition erro:', event.error);

        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            triggerError('Permissão de microfone negada. Clique no ícone de cadeado do navegador para permitir o microfone.');
            break;
          case 'no-speech':
            triggerError('Nenhuma fala foi detectada. Tente falar mais perto do microfone.');
            break;
          case 'audio-capture':
            triggerError('Nenhum microfone encontrado no computador/dispositivo.');
            break;
          default:
            triggerError(`Gravando voz... Fale suavemente no microfone.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Falha ao iniciar SpeechRecognition:', err);
      setIsListening(false);
      triggerError('Gravador ativo. Fale agora seu comando por voz.');
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Botão de Gravação de Microfone */}
      <button
        type="button"
        onClick={handleToggleListening}
        disabled={disabled}
        className={`voice-record-btn ${isListening ? 'recording' : ''}`}
        title={isListening ? 'Clique para encerrar a gravação de voz' : 'Falar por voz (Ativar Microfone)'}
        aria-label="Gravar mensagem por voz"
        id="voice-input-button"
      >
        {isListening ? (
          <Mic size={20} className="voice-mic-icon" />
        ) : (
          <Mic size={20} />
        )}
      </button>

      {/* Indicador Flutuante quando estiver ouvindo */}
      {isListening && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            right: '0',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.95), rgba(225, 29, 72, 0.95))',
            color: '#ffffff',
            padding: '0.45rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(244, 63, 94, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 50,
            animation: 'fadeInApp 0.25s ease-out'
          }}
        >
          <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span>🎙️ Ouvindo... Fale agora!</span>
        </div>
      )}

      {/* Alerta Flutuante de Erro / Orientação */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            right: '-10px',
            maxWidth: '280px',
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '0.55rem 0.85rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            lineHeight: '1.4',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
            zIndex: 60,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeInApp 0.25s ease-out'
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
