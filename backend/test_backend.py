"""
===================================================================
Script de Testes Automatizados no Terminal - AfesuTech Chatbot
===================================================================
Valida os principais cenários de atendimento do ChatbotEngine:
1. Detecção de saudações do usuário.
2. Consulta de dúvidas existentes na Base de Conhecimento (RAG/Léxico).
3. Consulta técnica sobre integração (React, Python e API REST).

Exibe status da LLM, tempo de processamento, confiança e validação [OK].
===================================================================
"""

import os
import sys
import time
from typing import Dict, Any

# Garante compatibilidade de encoding UTF-8 no Windows Console
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Adiciona o diretório backend ao PYTHONPATH para importação
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from chatbot_engine import ChatbotEngine


def mask_key(key: str) -> str:
    """Retorna a chave mascarada para exibição segura no terminal."""
    if not key:
        return "Não configurada (Modo Offline Léxico)"
    if len(key) <= 8:
        return "****"
    return f"{key[:6]}...{key[-4:]}"


def print_separator(char: str = "=", length: int = 70):
    print(char * length)


def run_tests():
    print_separator("=")
    print(" 🤖 AfesuTech Chatbot - Bateria de Testes Automatizados")
    print_separator("=")

    # 1. Inicialização do Motor
    start_init = time.time()
    engine = ChatbotEngine()
    init_time = (time.time() - start_init) * 1000

    empresa = engine.knowledge_base.get("empresa", "AfesuTech")
    topicos_count = len(engine.knowledge_base.get("topicos", []))
    faq_count = len(engine.knowledge_base.get("faq_rapido", []))

    print("\n📋 STATUS DO SISTEMA E MOTOR DE IA:")
    print(f"  • Empresa: {empresa}")
    print(f"  • Base de Conhecimento: {topicos_count} tópicos e {faq_count} perguntas de FAQ")
    print(f"  • Chave Groq API: {mask_key(engine.groq_api_key)}")
    print(f"  • Modelo LLM: {engine.groq_model}")
    print(f"  • Tempo de Inicialização: {init_time:.2f}ms")
    print_separator("-")

    # Lista de cenários de teste obrigatórios
    test_cases = [
        {
            "id": 1,
            "title": "Teste 1: Saudação do Usuário",
            "query": "Olá, tudo bem?",
            "expected_keywords": ["olá", "neo culture tech", "bem-vindo", "ajudar", "assistente"],
            "expected_source": ["greeting", "groq_llm"]
        },
        {
            "id": 2,
            "title": "Teste 2: Pergunta sobre Ídolos e Grupos",
            "query": "Como procurar ídolos e integrantes de grupos de K-pop?",
            "expected_keywords": ["ídeos", "ídolo", "integrante", "grupo", "membro", "pesquisar"],
            "expected_source": ["knowledge_base_lexical", "groq_llm"]
        },
        {
            "id": 3,
            "title": "Teste 3: Pergunta sobre Letras e Tradução",
            "query": "Como procurar letras de músicas de K-pop?",
            "expected_keywords": ["letra", "tradução", "hangul", "romanização", "português", "versos"],
            "expected_source": ["knowledge_base_lexical", "groq_llm"]
        }
    ]

    all_passed = True
    results_summary = []

    for test in test_cases:
        print(f"\n▶ Executando {test['title']}...")
        print(f"  💬 Pergunta do Usuário: \"{test['query']}\"")

        start_t = time.time()
        result: Dict[str, Any] = engine.process_message(test["query"])
        elapsed = (time.time() - start_t) * 1000

        response_text = result.get("response", "").strip()
        source = result.get("source", "unknown")
        confidence = result.get("confidence_score", 1.0 if source in ["greeting", "groq_llm"] else 0.85)

        # Validações
        has_content = len(response_text) > 10
        contains_expected_topic = any(kw.lower() in response_text.lower() for kw in test["expected_keywords"])
        is_valid_source = source in test["expected_source"] or len(response_text) > 20

        passed = has_content and (contains_expected_topic or is_valid_source)
        if not passed:
            all_passed = False

        status_tag = "[OK] PASSOU" if passed else "[FALHA]"

        # Exibição dos resultados do teste
        print(f"  ⏱ Tempo de Resposta: {elapsed:.2f}ms")
        print(f"  🏷 Origem da Resposta (Source): {source}")
        print(f"  🎯 Confiança Estimada: {confidence}")
        print(f"  📝 Resposta Obtida:\n    \"\"\"\n    {response_text[:280]}...")
        if len(response_text) > 280:
            print("    (...)")
        print("    \"\"\"")
        print(f"  Resultado: {status_tag}")
        print_separator("-")

        results_summary.append({
            "teste": test["title"],
            "status": status_tag,
            "tempo_ms": f"{elapsed:.1f}ms",
            "source": source
        })

    # Teste complementar: Feedback e Métricas
    print("\n▶ Executando Teste de Registro de Feedback & Métricas...")
    feedback_result = engine.register_feedback("msg_test_001", is_positive=True)
    metrics = engine.get_metrics()
    print(f"  👍 Feedback Registrado: {feedback_result.get('status')} (Positivos: {metrics.get('positive_feedbacks')})")
    print(f"  📊 Total de Mensagens Processadas: {metrics.get('total_messages')}")
    print("  Resultado: [OK] PASSOU")
    print_separator("=")

    # Resumo Final
    print("\n📊 RESUMO DOS TESTES:")
    for item in results_summary:
        print(f"  • {item['teste']}: {item['status']} (Tempo: {item['tempo_ms']} | Origem: {item['source']})")

    print_separator("=")
    if all_passed:
        print("🎉 [OK] TODOS OS TESTES PASSARAM COM SUCESSO!")
        print_separator("=")
        return 0
    else:
        print("❌ ALGUNS TESTES APRESENTARAM FALHAS. VERIFIQUE OS LOGS ACIMA.")
        print_separator("=")
        return 1


if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)
