"""
ChatbotEngine - Motor de Inteligência Artificial & PLN da AfesuTech
===================================================================
Este módulo implementa o núcleo inteligente do Chatbot de suporte ao cliente.
Ele combina processamento de linguagem natural (PLN) léxico com suporte a
LLMs generativas (Groq / Llama-3) via RAG (Retrieval-Augmented Generation),
além de controle de métricas e fallback robusto offline.
"""

import os
import sys
import json
import re
import uuid
import datetime
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple

# Garante compatibilidade de encoding UTF-8 no Windows Console
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


class ChatbotEngine:
    """
    Motor principal do Chatbot que gerencia o conhecimento factual da empresa,
    orquestra chamadas à LLM (Groq) e aplica algoritmos de PLN para busca léxica e fallback.
    """

    # Lista de stopwords comuns em português para filtragem léxica
    STOPWORDS = {
        "a", "agora", "ainda", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles",
        "aquilo", "as", "ate", "até", "com", "como", "da", "das", "de", "dela",
        "delas", "dele", "deles", "depois", "do", "dos", "e", "ela", "elas", "ele",
        "eles", "em", "entre", "era", "eram", "eramos", "éramos", "essa", "essas",
        "esse", "esses", "esta", "estas", "estava", "estavam", "este", "estes",
        "estive", "estivemos", "estiveram", "estou", "eu", "foi", "fomos", "foram",
        "fui", "ha", "há", "isso", "isto", "ja", "já", "lhe", "lhes", "mais", "mas",
        "me", "mesmo", "meu", "meus", "minha", "minhas", "muito", "na", "nas", "nao",
        "não", "nas", "nem", "no", "nos", "nós", "nossa", "nossas", "nosso", "nossos",
        "num", "numa", "o", "os", "ou", "para", "pela", "pelas", "pelo", "pelos",
        "por", "pra", "qual", "quais", "quando", "quanto", "quantos", "quanta",
        "quantas", "que", "quem", "sao", "são", "se", "sem", "ser", "seu", "seus",
        "so", "só", "somos", "sou", "sua", "suas", "tambem", "também", "te", "tem",
        "têm", "temos", "tenho", "ter", "teu", "teus", "tua", "tuas", "um", "uma",
        "umas", "uns", "voce", "você", "voces", "vocês", "vos", "vós"
    }

    # Padrões de saudações comuns
    GREETING_WORDS = {
        "ola", "olá", "oi", "oie", "opa", "bom dia", "boa tarde", "boa noite",
        "hello", "hi", "hey", "e ai", "e aí", "tudo bem", "como vai"
    }

    def __init__(self, knowledge_base_path: Optional[str] = None):
        """
        Inicializa o motor de chatbot, carregando a base de dados, variáveis de ambiente
        e estruturas de estado da conversa e métricas.
        """
        # Carrega variáveis do arquivo .env se existir
        self._load_env_file()

        # Configurações da API Groq
        self.groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
        self.groq_api_url = "https://api.groq.com/openai/v1/chat/completions"

        # Histórico de conversas multi-turn (mensagens no formato OpenAI/Groq)
        self.conversation_history: List[Dict[str, str]] = []
        self.max_history_turns = 10  # Mantém até 10 trocas de mensagens no contexto

        # Gestão de Métricas
        self.metrics: Dict[str, Any] = {
            "total_messages": 0,
            "resolved_by_llm": 0,
            "resolved_by_kb": 0,
            "greetings": 0,
            "fallbacks": 0,
            "positive_feedbacks": 0,
            "negative_feedbacks": 0,
            "feedback_history": {}
        }

        # Carrega a base de conhecimento factual
        self.knowledge_base_path = knowledge_base_path or self._resolve_kb_path()
        self.knowledge_base: Dict[str, Any] = self._load_knowledge_base()

    def _load_env_file(self) -> None:
        """
        Lê e carrega variáveis de ambiente de um arquivo .env localizado na raiz ou no backend.
        Evita dependências externas pesadas como python-dotenv.
        """
        possible_paths = [
            os.path.join(os.path.dirname(__file__), ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            ".env"
        ]

        for path in possible_paths:
            if os.path.isfile(path):
                try:
                    with open(path, "r", encoding="utf-8") as file:
                        for line in file:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                key, val = line.split("=", 1)
                                key = key.strip()
                                val = val.strip().strip("\"'")
                                if key and key not in os.environ:
                                    os.environ[key] = val
                    break
                except Exception as e:
                    print(f"Aviso ao carregar .env de {path}: {e}")

    def _resolve_kb_path(self) -> str:
        """Localiza o arquivo base_conhecimento.json em diretórios prováveis."""
        base_dir = os.path.dirname(os.path.abspath(__file__))
        paths_to_check = [
            os.path.join(base_dir, "base_conhecimento.json"),
            os.path.join(base_dir, "..", "backend", "base_conhecimento.json"),
            os.path.join("backend", "base_conhecimento.json"),
            "base_conhecimento.json"
        ]

        for p in paths_to_check:
            if os.path.exists(p):
                return p

        # Fallback padrão
        return os.path.join(base_dir, "base_conhecimento.json")

    def _load_knowledge_base(self) -> Dict[str, Any]:
        """Carrega e valida o conteúdo do arquivo JSON de conhecimento."""
        if not os.path.isfile(self.knowledge_base_path):
            print(f"Aviso: Base de conhecimento não encontrada em '{self.knowledge_base_path}'.")
            return {
                "empresa": "AfesuTech Soluções Inteligentes",
                "descricao": "Empresa de IA e Tecnologia",
                "topicos": [],
                "faq_rapido": []
            }

        try:
            with open(self.knowledge_base_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception as e:
            print(f"Erro ao carregar base de conhecimento: {e}")
            return {
                "empresa": "Neo Culture Tech",
                "descricao": "Empresa de IA e Tecnologia",
                "topicos": [],
                "faq_rapido": []
            }

    def _get_current_date_pt_br(self) -> str:
        """Gera a data atual formatada em português com dia da semana."""
        now = datetime.datetime.now()
        dias_semana = [
            "Segunda-feira", "Terça-feira", "Quarta-feira",
            "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
        ]
        meses = [
            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
        ]
        dia_nome = dias_semana[now.weekday()]
        mes_nome = meses[now.month - 1]
        return f"{dia_nome}, {now.day} de {mes_nome} de {now.year}"

    # ----------------------------------------------------------------------
    # 1. LLM Generativa & Prompt de Sistema (RAG)
    # ----------------------------------------------------------------------

    def _build_system_prompt(self) -> str:
        """
        Constrói o prompt de sistema injetando o contexto da empresa (Neo Culture Tech)
        e permitindo respostas para perguntas gerais e bate-papo normal.
        """
        empresa = self.knowledge_base.get("empresa", "Neo Culture Tech")
        descricao = self.knowledge_base.get("descricao", "")
        topicos = self.knowledge_base.get("topicos", [])
        faq_rapido = self.knowledge_base.get("faq_rapido", [])
        data_atual = self._get_current_date_pt_br()

        conhecimento_formatado = []
        for t in topicos:
            titulo = t.get("id", "").replace("_", " ").title()
            perguntas = ", ".join(t.get("perguntas_chave", []))
            resposta = t.get("resposta", "")
            conhecimento_formatado.append(
                f"### Tópico: {titulo}\n"
                f"- Perguntas associadas: {perguntas}\n"
                f"- Informação Oficial:\n{resposta}\n"
            )

        rag_context = "\n".join(conhecimento_formatado)
        faq_str = "\n".join([f"- {q}" for q in faq_rapido])

        prompt = f"""Você é a assistente de IA oficial da empresa {empresa} (hub de K-Pop, músicas, idols e cultura pop).

DATA ATUAL: {data_atual}.

SOBRE A EMPRESA:
{descricao}

BASE DE CONHECIMENTO DA EMPRESA (RAG):
{rag_context}

PERGUNTAS FREQUENTES DA EMPRESA:
{faq_str}

DIRETRIZES IMPORTANTES:
1. Seja sempre simpática, inteligente, atenciosa e estilosa (use emojis fofos como 🎀, ✨, 🎤, 🎧 quando pertinente).
2. Se o usuário perguntar sobre a Neo Culture Tech, K-Pop, ídolos, músicas, letras, traduções ou MVs, use as informações oficiais acima.
3. Se o usuário fizer perguntas GERAIS (como contas de matemática ex: "quanto é 2+2", curiosidades, conhecimentos gerais, ciência, tecnologia, saudações ou bate-papo normal), RESPONDA DE FORMA COMPLETA, CORRETA E PRECIOSA assim como uma IA conversacional normal (como o ChatGPT). NUNCA recuse responder perguntas simples ou gerais!
4. Responda sempre em Língua Portuguesa (Brasil).
"""
        return prompt

    def _call_groq_llm(self, user_message: str) -> Optional[str]:
        """
        Executa a requisição HTTP para a API da Groq utilizando urllib,
        tentando múltiplos modelos caso o modelo principal não esteja disponível.
        """
        if not self.groq_api_key:
            return None

        system_prompt = self._build_system_prompt()

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]

        messages.extend(self.conversation_history[-self.max_history_turns * 2:])
        messages.append({"role": "user", "content": user_message})

        # Lista de modelos Groq para tentar em ordem de prioridade
        models_to_try = [
            self.groq_model,
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ]

        # Evita duplicados mantendo a ordem
        seen = set()
        unique_models = []
        for m in models_to_try:
            if m and m not in seen:
                seen.add(m)
                unique_models.append(m)

        for model in unique_models:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 900
            }

            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.groq_api_url,
                data=data_bytes,
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "NeoCultureTech-ChatbotEngine/1.0"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=12) as response:
                    if response.status == 200:
                        resp_body = response.read().decode("utf-8")
                        resp_json = json.loads(resp_body)
                        assistant_reply = resp_json["choices"][0]["message"]["content"]

                        self.conversation_history.append({"role": "user", "content": user_message})
                        self.conversation_history.append({"role": "assistant", "content": assistant_reply})

                        if len(self.conversation_history) > self.max_history_turns * 2:
                            self.conversation_history = self.conversation_history[-self.max_history_turns * 2:]

                        return assistant_reply
            except Exception as e:
                # Se falhou com este modelo, tenta o próximo modelo da lista
                continue

        return None

    # ----------------------------------------------------------------------
    # 2. Motor Léxico & PLN Offline (Fallback)
    # ----------------------------------------------------------------------

    def _normalize_text(self, text: str) -> str:
        """Remove acentos e caracteres especiais para comparação fonética/léxica."""
        import unicodedata
        text = unicodedata.normalize("NFKD", text)
        return "".join(c for c in text if not unicodedata.combining(c))

    def _preprocess_text(self, text: str) -> List[str]:
        """
        Converte o texto para minúsculas, remove acentos, pontuação
        e filtra stopwords em português, retornando uma lista de tokens.
        """
        if not text:
            return []

        # Normaliza acentuação e converte para minúsculas
        text = self._normalize_text(text.lower())

        # Remove pontuação mantendo caracteres alfanuméricos e espaços
        text = re.sub(r"[^\w\s]", " ", text)

        # Tokenização por espaços em branco
        tokens = text.split()

        # Stopwords normalizadas
        normalized_stopwords = {self._normalize_text(sw) for sw in self.STOPWORDS}

        # Filtra stopwords e palavras com menos de 2 caracteres
        filtered_tokens = [t for t in tokens if t not in normalized_stopwords and len(t) > 1]
        return filtered_tokens

    def _calculate_similarity(self, query_tokens: List[str], target_phrase: str) -> float:
        """
        Calcula a taxa de sobreposição léxica considerando correspondência exata
        e correspondência por prefixo/radical (stemming leve) em português.
        """
        if not query_tokens:
            return 0.0

        target_tokens = self._preprocess_text(target_phrase)
        if not target_tokens:
            return 0.0

        set_query = set(query_tokens)
        set_target = set(target_tokens)

        # 1. Correspondência exata
        exact_matches = set_query.intersection(set_target)

        # 2. Correspondência por radical (prefixo de pelo menos 4 caracteres)
        stem_matches = set()
        for q in set_query:
            if q in exact_matches:
                continue
            q_stem = q[:4] if len(q) >= 4 else q
            for t in set_target:
                t_stem = t[:4] if len(t) >= 4 else t
                if q_stem == t_stem or q.startswith(t_stem) or t.startswith(q_stem):
                    stem_matches.add(q)
                    break

        total_matched = len(exact_matches) + (len(stem_matches) * 0.85)

        # Métricas combinadas de cobertura
        query_coverage = total_matched / len(set_query) if set_query else 0.0
        target_coverage = total_matched / len(set_target) if set_target else 0.0

        union_size = len(set_query.union(set_target))
        jaccard = total_matched / union_size if union_size > 0 else 0.0

        # Score ponderado: prioriza cobrir os termos da busca do usuário
        return (query_coverage * 0.5) + (jaccard * 0.3) + (target_coverage * 0.2)

    def _is_greeting(self, text: str) -> bool:
        """Verifica se o texto do usuário é uma saudação inicial."""
        cleaned = text.strip().lower()
        cleaned_no_punct = re.sub(r"[^\w\s]", "", cleaned)

        # Checagem exata ou palavras-chave isoladas
        if cleaned_no_punct in self.GREETING_WORDS:
            return True

        tokens = cleaned_no_punct.split()
        if len(tokens) <= 3:
            for greeting in self.GREETING_WORDS:
                if greeting in cleaned_no_punct:
                    return True
        return False

    def _generate_greeting_response(self) -> str:
        """Gera uma resposta acolhedora de boas-vindas com opções rápidas."""
        empresa = self.knowledge_base.get("empresa", "AfesuTech Soluções Inteligentes")
        faq = self.knowledge_base.get("faq_rapido", [])

        faq_lines = "\n".join([f"• *{q}*" for q in faq])

        return (
            f"👋 Olá! Seja muito bem-vindo(a) à **{empresa}**!\n\n"
            f"Sou seu assistente virtual inteligente e estou aqui para tirar suas dúvidas e ajudá-lo(a) a encontrar a melhor solução.\n\n"
            f"📌 **Você pode me perguntar sobre:**\n"
            f"{faq_lines}\n\n"
            f"Como posso te ajudar hoje? 😊"
        )

    def _find_best_topic_lexical(self, user_message: str, threshold: float = 0.25) -> Optional[Tuple[Dict[str, Any], float]]:
        """
        Busca o tópico mais similar na base de conhecimento com base nas perguntas-chave.
        Retorna uma tupla (topico, score) se ultrapassar o limiar de similaridade.
        """
        query_tokens = self._preprocess_text(user_message)
        if not query_tokens:
            return None

        best_topic = None
        best_score = 0.0

        for topico in self.knowledge_base.get("topicos", []):
            # Compara contra o identificador do tópico
            topic_id_str = topico.get("id", "").replace("_", " ")
            score_id = self._calculate_similarity(query_tokens, topic_id_str)
            if score_id > best_score:
                best_score = score_id
                best_topic = topico

            # Compara contra todas as perguntas-chave cadastradas
            for pergunta in topico.get("perguntas_chave", []):
                score = self._calculate_similarity(query_tokens, pergunta)
                if score > best_score:
                    best_score = score
                    best_topic = topico

        if best_topic and best_score >= threshold:
            return best_topic, best_score

        return None

    def _generate_fallback_response(self) -> str:
        """Gera uma resposta de fallback elegante quando não há correspondência segura."""
        faq = self.knowledge_base.get("faq_rapido", [])
        faq_sugestoes = "\n".join([f"🔹 {q}" for q in faq[:3]])

        return (
            "🤔 Desculpe, não consegui compreender totalmente sua solicitação ou não encontrei essa informação específica em minha base.\n\n"
            "💡 **Você pode tentar:**\n"
            f"{faq_sugestoes}\n"
            "🔹 Falar diretamente com nosso suporte: `suporte@afesutech.com.br`\n\n"
            "Por favor, tente reformular sua pergunta ou escolha um dos tópicos acima!"
        )

    # ----------------------------------------------------------------------
    # 3. Processamento de Mensagens & Gestão de Métricas
    # ----------------------------------------------------------------------

    def _try_evaluate_math_or_general(self, text: str) -> Optional[str]:
        """
        Avalia perguntas matemáticas (expressões, porcentagens, operações),
        data/hora atuais e perguntas gerais de bate-papo.
        """
        raw = text.strip().lower()

        # Dicionário de números por extenso em português
        num_map = {
            "zero": 0, "um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3, "tres": 3,
            "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10,
            "onze": 11, "doze": 12, "treze": 13, "quatorze": 14, "catorze": 14, "quinze": 15,
            "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19, "vinte": 20,
            "trinta": 30, "quarenta": 40, "cinquenta": 50, "sessenta": 60, "setenta": 70,
            "oitenta": 80, "noventa": 90, "cem": 100
        }

        op_map = {
            "mais": "+", "somado com": "+", "somada a": "+", "+": "+",
            "menos": "-", "subtraído de": "-", "subtraida de": "-", "-": "-",
            "vezes": "*", "multiplicado por": "*", "multiplicada por": "*", "*": "*", "x": "*",
            "dividido por": "/", "dividida por": "/", "/": "/"
        }

        # 1. Porcentagem (ex: 20% de 150)
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*de\s*(\d+(?:\.\d+)?)", raw)
        if pct_match:
            pct_val = float(pct_match.group(1))
            total_val = float(pct_match.group(2))
            res = (pct_val / 100.0) * total_val
            if res.is_integer():
                res = int(res)
            return f"✨ **{pct_match.group(1)}% de {pct_match.group(2)} é igual a {res}!** 🎀"

        # 2. Expressões matemáticas gerais
        math_text = raw.replace("quanto é", "").replace("quanto e", "").replace("qual é o resultado de", "").replace("qual o resultado de", "").replace("?", "").strip()

        tokens = math_text.split()
        converted_tokens = []
        for token in tokens:
            if token in num_map:
                converted_tokens.append(str(num_map[token]))
            elif token in op_map:
                converted_tokens.append(op_map[token])
            else:
                converted_tokens.append(token)

        expr_str = " ".join(converted_tokens)
        clean_expr = re.sub(r"[^\d\+\-\*\/\.\s]", "", expr_str).strip()

        if clean_expr and re.search(r"\d", clean_expr) and re.search(r"[\+\-\*\/]", clean_expr):
            try:
                allowed_chars = set("0123456789+-*/. ")
                if set(clean_expr).issubset(allowed_chars):
                    res = eval(clean_expr)
                    if isinstance(res, float) and res.is_integer():
                        res = int(res)
                    return f"✨ **O resultado é {res}!** 🎀\n\nPrecisa de mais alguma conta ou dúvida sobre a Neo Culture Tech?"
            except Exception:
                pass

        # 3. Data e Hora
        if any(p in raw for p in ["que dia e hoje", "que dia e", "qual a data de hoje", "data de hoje"]):
            data_str = self._get_current_date_pt_br()
            return f"📅 Hoje é **{data_str}**! ✨"

        if any(p in raw for p in ["que horas sao", "que horas e", "qual o horario"]):
            hora_str = datetime.datetime.now().strftime("%H:%M")
            return f"⏰ Agora são **{hora_str}**! 🎀"

        # 4. Perguntas de bate-papo e conhecimentos gerais
        if any(p in raw for p in ["tudo bem", "como voce esta", "como vai"]):
            return "😊 Está tudo ótimo por aqui! Pronta para te ajudar com dúvidas de K-Pop, músicas, ídolos e bate-papo. E com você, como estão as coisas? 🎀✨"

        if any(p in raw for p in ["qual e o seu nome", "qual o seu nome", "como voce se chama", "quem e voce", "quem voce e"]):
            return "🎀 Olá! Eu sou a **Assistente Virtual Inteligente da Neo Culture Tech**! Estou aqui para responder suas dúvidas sobre K-Pop, músicas, ídolos, letras e muito mais! ✨"

        if any(p in raw for p in ["quem te criou", "quem desenvolveu você", "quem criou voce"]):
            return "🚀 Fui desenvolvida pela equipe da **Neo Culture Tech** para proporcionar a melhor experiência interativa com inteligência artificial, suporte a voz e catálogo de K-Pop!"

        if "o que e kpop" in raw or "o que e k-pop" in raw:
            return "🎵 **K-Pop (Korean Pop)** é o gênero de música popular originário da Coreia do Sul, conhecido por suas produções espetaculares, coreografias marcantes, conceitos visuais e grupos lendários como NCT, BTS, BLACKPINK, TWICE, aespa, Stray Kids e NewJeans! 🎀"

        if "capital da franca" in raw or "capital da frança" in raw:
            return "🗼 A capital da França é **Paris**! ✨"

        if "capital do brasil" in raw:
            return "🇧🇷 A capital do Brasil é **Brasília**! ✨"

        if "capital da coreia" in raw or "capital da coreia do sul" in raw:
            return "🇰🇷 A capital da Coreia do Sul é **Seul (Seoul)**! 🌸"

        if "capital do japao" in raw or "capital do japão" in raw:
            return "🇯🇵 A capital do Japão é **Tóquio (Tokyo)**! 🏯"

        return None

    def process_message(self, user_message: str) -> Dict[str, Any]:
        """
        Ponto de entrada principal para processar mensagens do usuário.
        Coordena saudações, LLM generativa, busca léxica, avaliador geral e fallback offline.
        """
        self.metrics["total_messages"] += 1
        message_id = f"msg_{int(datetime.datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"
        timestamp = datetime.datetime.now().isoformat()
        user_message_clean = user_message.strip() if user_message else ""

        if not user_message_clean:
            return {
                "message_id": message_id,
                "response": "Por favor, digite uma mensagem para que eu possa ajudá-lo(a)! 😊",
                "source": "empty_input",
                "timestamp": timestamp
            }

        # 1. Detecção de saudações rápidas
        if self._is_greeting(user_message_clean):
            self.metrics["greetings"] += 1
            return {
                "message_id": message_id,
                "response": self._generate_greeting_response(),
                "source": "greeting",
                "timestamp": timestamp
            }

        # 2. Avaliador de Matemática & Perguntas Gerais Básicas (Instantâneo)
        general_answer = self._try_evaluate_math_or_general(user_message_clean)
        if general_answer:
            self.metrics["resolved_by_llm"] += 1
            return {
                "message_id": message_id,
                "response": general_answer,
                "source": "general_knowledge",
                "confidence": 1.0,
                "timestamp": timestamp
            }

        # 3. Tentativa via LLM Generativa (Groq com fallback de modelos)
        if self.groq_api_key:
            llm_response = self._call_groq_llm(user_message_clean)
            if llm_response:
                self.metrics["resolved_by_llm"] += 1
                return {
                    "message_id": message_id,
                    "response": llm_response,
                    "source": "groq_llm",
                    "model": self.groq_model,
                    "confidence": 0.95,
                    "timestamp": timestamp
                }

        # 4. Motor Léxico Offline (Fallback RAG local da Base de Conhecimento)
        match_result = self._find_best_topic_lexical(user_message_clean)
        if match_result:
            topico, score = match_result
            self.metrics["resolved_by_kb"] += 1
            return {
                "message_id": message_id,
                "response": topico.get("resposta", ""),
                "source": "knowledge_base_lexical",
                "topic_id": topico.get("id"),
                "confidence_score": round(score, 3),
                "timestamp": timestamp
            }

        # 5. Fallback Geral
        self.metrics["fallbacks"] += 1
        return {
            "message_id": message_id,
            "response": self._generate_fallback_response(),
            "source": "fallback",
            "confidence": 0.3,
            "timestamp": timestamp
        }

    def register_feedback(self, message_id: str, is_positive: bool) -> Dict[str, Any]:
        """
        Registra a avaliação do usuário (positiva ou negativa) para uma resposta específica.
        """
        if is_positive:
            self.metrics["positive_feedbacks"] += 1
            status = "positive"
        else:
            self.metrics["negative_feedbacks"] += 1
            status = "negative"

        self.metrics["feedback_history"][message_id] = {
            "status": status,
            "recorded_at": datetime.datetime.now().isoformat()
        }

        return {
            "message_id": message_id,
            "status": status,
            "total_positive": self.metrics["positive_feedbacks"],
            "total_negative": self.metrics["negative_feedbacks"]
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Retorna o estado consolidado das métricas de atendimento."""
        return self.metrics.copy()

    def clear_history(self) -> None:
        """Limpa o histórico da sessão de conversação multi-turn."""
        self.conversation_history.clear()


# Bloco de execução direta para testes rápidos no terminal
if __name__ == "__main__":
    print("🤖 Inicializando AfesuTech Chatbot Engine...")
    engine = ChatbotEngine()

    print(f"Empresa: {engine.knowledge_base.get('empresa')}")
    print(f"Tópicos carregados: {len(engine.knowledge_base.get('topicos', []))}")
    print(f"Groq API Key configurada: {'Sim' if engine.groq_api_key else 'Não (usando motor léxico)'}")
    print("-" * 50)

    test_queries = [
        "Olá, bom dia!",
        "Quanto custa o plano Pro?",
        "Como funciona a IA com meus próprios documentos?",
        "Qual a previsão do tempo para amanhã em Tóquio?",
        "Como entro em contato com o suporte?"
    ]

    for query in test_queries:
        print(f"\n👤 Usuário: {query}")
        result = engine.process_message(query)
        print(f"🤖 Bot ({result['source']}):\n{result['response']}")
        print("-" * 50)

    print("\n📊 Métricas Consolidadas:")
    print(json.dumps(engine.get_metrics(), indent=2, ensure_ascii=False))
