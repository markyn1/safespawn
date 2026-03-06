"""
core/variable_resolver.py
Parser de variáveis !{var} para textos estáticos e prompts de IA.

Uso:
    resolver = VariableResolver(profile, context)
    text = resolver.resolve("Siga !{username} 🔥")
    # → "Siga @marcos_reels 🔥"
"""

import re
import json
from typing import Optional


class VariableResolver:
    """
    Resolve variáveis no formato !{nome} em qualquer texto.
    
    Ordem de resolução:
    1. Campos fixos do perfil (username, display_name, contact, genre)
    2. Variáveis customizadas (custom_vars)
    3. Variável especial !{context} → JSON do StructuredContext
    4. Variável especial !{max_chars} → limite de caracteres do bloco
    5. Se não resolvida, mantém o original !{nome}
    """

    PATTERN = re.compile(r'!\{(\w+)\}')

    def __init__(
        self,
        profile: Optional[dict] = None,
        context: Optional[dict] = None,
        extra_vars: Optional[dict] = None,
    ):
        """
        Args:
            profile: Dicionário com campos do ProfileConfig
                     (username, display_name, contact, genre, custom_vars)
            context: Dicionário do StructuredContext (resultado da análise de IA)
            extra_vars: Variáveis adicionais pontuais (ex: max_chars do bloco)
        """
        self._vars: dict[str, str] = {}

        if profile:
            self._vars["username"] = str(profile.get("username") or "")
            self._vars["display_name"] = str(profile.get("display_name") or "")
            self._vars["contact"] = str(profile.get("contact") or "")
            self._vars["genre"] = str(profile.get("genre") or "")
            custom = profile.get("custom_vars") or {}
            for k, v in custom.items():
                self._vars[str(k)] = str(v)

        if context:
            self._vars["context"] = json.dumps(context, ensure_ascii=False, indent=2)

        if extra_vars:
            for k, v in extra_vars.items():
                self._vars[str(k)] = str(v)

    def resolve(self, text: str) -> str:
        """Substitui todas as ocorrências de !{var} no texto."""
        if not text:
            return text or ""

        def replacer(match: re.Match) -> str:
            key = match.group(1)
            if key in self._vars:
                return self._vars[key]
            # Variável não encontrada — manter original para não quebrar
            return match.group(0)

        return self.PATTERN.sub(replacer, text)

    def list_available(self) -> dict[str, str]:
        """Retorna todas as variáveis disponíveis para exibição no frontend."""
        return dict(self._vars)

    @staticmethod
    def extract_variables(text: str) -> list[str]:
        """Extrai nomes de todas as variáveis !{var} presentes em um texto."""
        return VariableResolver.PATTERN.findall(text)
