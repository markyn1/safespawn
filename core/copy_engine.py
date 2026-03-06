"""
core/copy_engine.py
Gera texto para cada bloco dinâmico com suporte a variáveis !{} e prompts por bloco.

Mantém compatibilidade com o fluxo legado (generate_legacy) para não quebrar
layouts que ainda não migraram para o sistema de blocos dinâmicos.
"""

import json
from dataclasses import dataclass, field

from core.ai_engine import AIEngine
from core.context_engine import StructuredContext
from core.config_loader import AppConfig
from core.variable_resolver import VariableResolver


@dataclass
class CopyObject:
    """
    Resultado de cópia gerado.
    
    - blocks: dict[label] = texto gerado para cada bloco dinâmico
    - Legacy fields mantidos para compatibilidade com DesignEngine
    """
    blocks: dict = field(default_factory=dict)

    # Legacy - mantidos para não quebrar pipelines existentes
    titulo: str = ""
    subtitulo: str = ""
    hook: str = ""
    legenda: str = ""
    hashtags: list[str] = field(default_factory=list)
    variacao_titulo_b: str = ""
    variacao_titulo_c: str = ""
    estilo_narrativo_utilizado: str = ""
    estrategia_de_retencao_aplicada: str = ""
    conexao_cultural_ou_relevancia: str = ""
    cta_final: str = ""

    def to_dict(self) -> dict:
        return {
            "titulo": self.titulo,
            "subtitulo": self.subtitulo,
            "hook": self.hook,
            "legenda": self.legenda,
            "hashtags": self.hashtags,
            "variacao_titulo_b": self.variacao_titulo_b,
            "variacao_titulo_c": self.variacao_titulo_c,
            "blocks": self.blocks,
        }


class CopyEngine:
    def __init__(self, config: AppConfig, ai_engine: AIEngine, ai_styles: dict = None):
        self.config = config
        self.ai = ai_engine
        self._prompt_cache: dict[str, str] = {}
        self._ai_styles: dict[str, str] = ai_styles or {}

    # ─────────────────────────────────────────────
    # NEW: Block-based generation
    # ─────────────────────────────────────────────

    def generate_block(
        self,
        block: dict,
        profile: dict,
        context: StructuredContext,
    ) -> str:
        """
        Gera o texto de um único TextBlock dinâmico.

        Args:
            block: Dicionário com dados do TextBlock (prompt_override, ai_output_key, w, h, font_size)
            profile: Dicionário do ProfileConfig (username, display_name, custom_vars, etc.)
            context: StructuredContext da análise do vídeo

        Returns:
            O texto gerado (str)
        """
        # Determina a largura máxima aproximada de caracteres pelo tamanho do bloco
        font_size = max(block.get("font_size", 60), 1)
        w_px = block.get("w", 800)
        max_chars = max(int(w_px / (font_size * 0.55)), 10)

        # Monta o resolver com todas as variáveis disponíveis
        resolver = VariableResolver(
            profile=profile,
            context=context.to_dict(),
            extra_vars={"max_chars": str(max_chars)},
        )

        # Seleciona o prompt: override inline > template content > fallback genérico
        raw_prompt = (
            block.get("prompt_override")
            or block.get("prompt_template_content")  # pré-carregado pela pipeline
            or self._default_block_prompt(block.get("label", "texto"))
        )

        # Resolve variáveis !{} no prompt
        prompt = resolver.resolve(raw_prompt)

        behavior = self.config.profile.get("ai_behavior", {})
        system = (
            f"Você é um copywriter expert em conteúdo para redes sociais. "
            f"Voz da marca: {behavior.get('brand_voice', 'autoridade amigável')}. "
            f"Idioma: {behavior.get('language', 'pt-BR')}. "
            f"Responda APENAS com o texto solicitado, sem introduções, explicações ou aspas."
        )

        print(f"[CopyEngine] ✍️  Generating block '{block.get('label', '?')}'...")
        result_text = self.ai.complete(prompt=prompt, system=system, as_json=False)
        return result_text.strip() if result_text else ""

    def generate_blocks(
        self,
        blocks: list[dict],
        profile: dict,
        context: StructuredContext,
    ) -> dict[str, str]:
        """
        Gera texto para todos os blocos de uma vez.
        Usa Batch Generation (Phase 10) para otimizar custo e tempo.
        """
        results = {}
        ai_blocks = []
        
        # 1. Separar blocos estáticos e coletar blocos de IA
        for block in blocks:
            if not block.get("visible", block.get("enabled", True)):
                continue
                
            label = block.get("label", "Sem Nome")
            
            if not block.get("ai_enabled", True):
                # Bloco estático — resolve variáveis !{} no valor manual
                resolver = VariableResolver(profile=profile, context=context.to_dict())
                results[label] = resolver.resolve(str(block.get("value", block.get("static_value", ""))))
            else:
                ai_blocks.append(block)

        if not ai_blocks:
            return results

        # 2. Executar Batch Generation para os blocos de IA
        print(f"[CopyEngine] 🚀 Executing batch generation for {len(ai_blocks)} blocks...")
        
        # Montar o Prompt Mestre
        batch_requirements = []
        for b in ai_blocks:
            label = b.get("label", "Desconhecido")
            font_size = max(b.get("font_size", b.get("fontSize", 60)), 1)
            w_px = b.get("w", 800)
            max_chars = max(int(w_px / (font_size * 0.55)), 10)
            
            # Resolve prompt individual
            resolver = VariableResolver(
                profile=profile, 
                context=context.to_dict(), 
                extra_vars={"max_chars": str(max_chars)}
            )
            raw_p = (
                b.get("prompt_override") 
                or b.get("prompt_template_content") 
                or self._default_block_prompt(label)
            )
            resolved_p = resolver.resolve(raw_p)
            
            # Formata instrução para o prompt mestre
            batch_requirements.append(f"- CAMPO '{label}': {resolved_p}")

        master_prompt = (
            f"Gere o conteúdo para os seguintes campos de um layout de rede social, respeitando as instruções de cada um.\n\n"
            f"REQUISITOS POR CAMPO:\n" + "\n".join(batch_requirements) + "\n\n"
            f"IMPORTANTE: Retorne APENAS um objeto JSON onde as chaves são os nomes exatos dos campos (ex: 'Título') e os valores são os textos gerados."
        )

        behavior = self.config.profile.get("ai_behavior", {})
        system = (
            f"Você é um copywriter expert em marketing digital. Voz: {behavior.get('brand_voice', 'autoridade amigável')}. "
            f"Idioma: {behavior.get('language', 'pt-BR')}. Responda estritamente em JSON."
        )

        try:
            batch_result = self.ai.complete(prompt=master_prompt, system=system, as_json=True)
            if isinstance(batch_result, dict):
                # Mesclar resultados da IA mantendo labels originais
                for b in ai_blocks:
                    label = b.get("label")
                    # Tenta pegar por label exato, ou ignorando case
                    val = batch_result.get(label)
                    if val is None:
                        # Fallback case-insensitive
                        val = next((v for k, v in batch_result.items() if k.lower() == label.lower()), "")
                    results[label] = str(val).strip()
            else:
                print("[CopyEngine] ⚠️ Batch result was not a dict. Falling back to empty strings.")
        except Exception as e:
            print(f"[CopyEngine] ❌ Error in Batch Generation: {e}")
            # Fallback opcional: poderia tentar generate_block individual aqui se fosse crítico

        return results


    # ─────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────

    def _default_block_prompt(self, label: str) -> str:
        """Prompt de fallback quando o bloco não tem template nem override."""
        return (
            f"CONTEXTO DO CONTEÚDO:\n!{{context}}\n\n"
            f"Gere um texto criativo para o campo '{label}' com no máximo !{{max_chars}} caracteres. "
            f"Seja direto e impactante. Responda APENAS com o texto."
        )

