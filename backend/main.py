"""
===================================================================
API REST do Chatbot de Suporte Inteligente - AfesuTech
===================================================================
Servidor web desenvolvido com FastAPI para disponibilizar o motor
de IA (ChatbotEngine) para clientes web, mobile e dashboards.

Endpoints disponíveis:
- GET  /                   : Status da API e lista de rotas
- POST /api/chat           : Processamento de mensagens com IA/RAG
- GET  /api/knowledge-base : Consulta à base de conhecimento
- GET  /api/metrics        : Métricas de atendimento e satisfação
- POST /api/feedback       : Registro de avaliações (Like/Dislike)
===================================================================
"""

import os
import sys
import time
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Garante que o diretório atual esteja no PYTHONPATH para importar o chatbot_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from chatbot_engine import ChatbotEngine

# ----------------------------------------------------------------------
# 1. Inicialização da Aplicação FastAPI
# ----------------------------------------------------------------------
app = FastAPI(
    title="Neo Culture Tech Chatbot API",
    description="API REST para suporte ao cliente com IA, RAG e processamento de linguagem natural.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ----------------------------------------------------------------------
# 2. Configuração de CORS (Cross-Origin Resource Sharing)
# Permite conexão a partir do frontend Vite/React em qualquer porta/origem
# ----------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instância única do motor do chatbot para gerenciar estado e métricas
engine = ChatbotEngine()


# ----------------------------------------------------------------------
# 3. Modelos Pydantic (Validação e Serialização)
# ----------------------------------------------------------------------
class MessageRequest(BaseModel):
    """Modelo de entrada para envio de mensagens pelo usuário."""
    message: str = Field(..., description="Mensagem de texto enviada pelo usuário")
    session_id: Optional[str] = Field(None, description="Identificador opcional da sessão do usuário")


class FeedbackRequest(BaseModel):
    """Modelo para registro de feedback de Like/Dislike."""
    message_id: str = Field(..., description="Identificador único da mensagem avaliada")
    is_positive: bool = Field(..., description="True para Like (positivo), False para Dislike (negativo)")


class ChatResponse(BaseModel):
    """Modelo de resposta estruturada para mensagens do chat."""
    message_id: Optional[str] = Field(None, description="Identificador único da resposta gerada")
    reply: str = Field(..., description="Texto da resposta gerada pelo assistente")
    source: str = Field(..., description="Origem da resposta ('greeting', 'groq_llm', 'knowledge_base_lexical', 'fallback')")
    confidence: float = Field(..., description="Grau de confiança estimado da resposta (entre 0.0 e 1.0)")
    timestamp: float = Field(..., description="Carimbo de data/hora no formato POSIX (segundos)")
    suggested_actions: List[str] = Field(default_factory=list, description="Lista de perguntas rápidas ou ações sugeridas")


# ----------------------------------------------------------------------
# 4. Endpoints da API REST
# ----------------------------------------------------------------------

@app.get("/", tags=["Status"])
def get_status() -> Dict[str, Any]:
    """
    Retorna o status de saúde da API e a lista de endpoints disponíveis.
    """
    return {
        "status": "online",
        "service": "Neo Culture Tech Chatbot API",
        "version": "1.0.0",
        "message": "Servidor do Chatbot Neo Culture Tech em execução.",
        "endpoints": {
            "root": "GET /",
            "chat": "POST /api/chat",
            "knowledge_base": "GET /api/knowledge-base",
            "metrics": "GET /api/metrics",
            "feedback": "POST /api/feedback",
            "docs": "GET /docs"
        }
    }


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
def post_chat_message(payload: MessageRequest) -> ChatResponse:
    """
    Recebe uma mensagem de usuário, processa através do ChatbotEngine
    (priorizando LLM Groq -> Busca Léxica na Base de Conhecimento -> Fallback)
    e retorna o ChatResponse com a resposta e metadados.
    """
    raw_message = payload.message.strip() if payload.message else ""
    if not raw_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O campo 'message' não pode ser vazio."
        )

    # Processa no motor de IA
    result = engine.process_message(raw_message)

    # Identifica fonte e define grau de confiança
    source = result.get("source", "unknown")
    if source == "knowledge_base_lexical":
        confidence = float(result.get("confidence_score", 0.85))
    elif source == "groq_llm":
        confidence = 0.95
    elif source == "greeting":
        confidence = 1.0
    elif source == "fallback":
        confidence = 0.20
    else:
        confidence = 0.50

    # Sugestões rápidas de FAQ da base de conhecimento
    suggested_actions = engine.knowledge_base.get("faq_rapido", [])

    return ChatResponse(
        message_id=result.get("message_id"),
        reply=result.get("response", ""),
        source=source,
        confidence=confidence,
        timestamp=time.time(),
        suggested_actions=suggested_actions
    )


@app.get("/api/knowledge-base", tags=["Base de Conhecimento"])
def get_knowledge_base() -> Dict[str, Any]:
    """
    Retorna a base de conhecimento completa carregada na memória do motor.
    """
    return engine.knowledge_base


@app.get("/api/metrics", tags=["Métricas"])
def get_metrics() -> Dict[str, Any]:
    """
    Retorna estatísticas consolidadas de atendimentos e calcula a taxa percentual de satisfação.
    """
    metrics_data = engine.get_metrics()
    total_messages = metrics_data.get("total_messages", 0)
    positives = metrics_data.get("positive_feedbacks", 0)
    negatives = metrics_data.get("negative_feedbacks", 0)
    total_feedbacks = positives + negatives

    # Cálculo da taxa de satisfação (%)
    if total_feedbacks > 0:
        satisfaction_rate = round((positives / total_feedbacks) * 100, 2)
    else:
        # Se ainda não houver feedbacks, considera 100% como baseline inicial se houver mensagens, ou 0%
        satisfaction_rate = 100.0 if total_messages > 0 else 0.0

    return {
        "total_atendimentos": total_messages,
        "taxa_satisfacao_percentual": satisfaction_rate,
        "feedbacks_positivos": positives,
        "feedbacks_negativos": negatives,
        "total_feedbacks": total_feedbacks,
        "detalhes": {
            "resolvidos_llm": metrics_data.get("resolved_by_llm", 0),
            "resolvidos_base_conhecimento": metrics_data.get("resolved_by_kb", 0),
            "saudacoes": metrics_data.get("greetings", 0),
            "fallbacks": metrics_data.get("fallbacks", 0)
        }
    }


@app.post("/api/feedback", tags=["Feedback"])
def post_feedback(payload: FeedbackRequest) -> Dict[str, Any]:
    """
    Registra uma avaliação de satisfação (Like/Dislike) associada a uma mensagem específica.
    """
    result = engine.register_feedback(payload.message_id, payload.is_positive)
    return {
        "success": True,
        "message": "Feedback registrado com sucesso.",
        "data": result
    }


# ----------------------------------------------------------------------
# 5. Bloco de Execução Principal (Uvicorn)
# ----------------------------------------------------------------------
if __name__ == "__main__":
    print("🚀 Iniciando servidor FastAPI AfesuTech em http://localhost:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
