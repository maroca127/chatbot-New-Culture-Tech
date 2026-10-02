import React, { useState, useEffect } from 'react';
import CoquetteBows from './components/CoquetteBows';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import SplashScreen from './components/SplashScreen';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * App Component (Prompt 10)
 * Gerencia a vinheta de abertura (SplashScreen), o tema (dark/light),
 * a verificação periódica de saúde da API (health check em /api/metrics)
 * e renderiza a aplicação com a barra superior (Header.jsx) e o ChatWindow.jsx.
 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mari-theme') || 'dark';
  });
  const [isApiOnline, setIsApiOnline] = useState(false);

  // Verificação periódica de saúde da API (Health Check em /api/metrics)
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/metrics`);
        if (res.ok) {
          setIsApiOnline(true);
        } else {
          setIsApiOnline(false);
        }
      } catch (err) {
        setIsApiOnline(false);
      }
    };

    checkApiHealth();
    const interval = setInterval(checkApiHealth, 10000); // Executa a cada 10s
    return () => clearInterval(interval);
  }, []);

  // Aplica a classe de tema no <html> e persiste no localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mari-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <>
      <CoquetteBows />
      <ChatWindow
        theme={theme}
        onToggleTheme={toggleTheme}
        isApiOnline={isApiOnline}
      />
    </>
  );
}
