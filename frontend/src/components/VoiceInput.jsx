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

    // Se já estiver escutando, interrompe a gravação
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

    // 1. Validação de Contexto Seguro (HTTPS ou localhost)
    const isSecure = window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecure) {
      triggerError('O microfone exige conexão segura HTTPS no celular (ex: Localtunnel ou ngrok).');
      return;
    }

    // 2. Validação da API nos navegadores
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerError('Navegador incompatível. Use o Google Chrome ou Safari.');
      setIsSupported(false);
      return;
    }

    setErrorMessage(null);

    try {
      // Cria uma nova instância a cada gravação para máxima estabilidade em celulares
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
            triggerError('Permissão de microfone negada. Toque no ícone de cadeado e permita o microfone.');
            break;
          case 'no-speech':
            triggerError('Nenhuma fala foi detectada. Tente falar mais próximo ao microfone.');
            break;
          case 'audio-capture':
            triggerError('Nenhum microfone encontrado no dispositivo.');
            break;
          case 'network':
            triggerError('Erro de conexão com o serviço de transcrição do navegador.');
            break;
          case 'aborted':
            // Cancelamento voluntário do usuário
            break;
          default:
            triggerError(`Erro ao capturar áudio (${event.error}). Tente novamente.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Falha ao iniciar SpeechRecognition:', err);
      setIsListening(false);
      triggerError('Não foi possível iniciar o microfone. Tente recarregar a página.');
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Botão de Gravação de Microfone */}
      <button
        type="button"
        onClick={handleToggleListening}
        disabled={disabled || !isSupported}
        className={`voice-record-btn ${isListening ? 'recording' : ''}`}
        title={
          !isSupported
            ? 'Reconhecimento de voz não suportado neste navegador'
            : isListening
            ? 'Clique para encerrar gravação'
            : 'Falar por voz (Speech-to-Text)'
        }
        aria-label="Gravar mensagem por voz"
        id="voice-input-button"
      >
        {isListening ? (
          <Mic size={20} className="voice-mic-icon" />
        ) : !isSupported ? (
          <MicOff size={20} style={{ opacity: 0.5 }} />
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
