import type { Prompt } from "@/types/prompts";

export const systemPrompts: Prompt[] = [
    // ── Análise ──────────────────────────────────────────────
    {
        id: "sys_analyze_video",
        title: "Analisar vídeo e gerar título",
        body: "Analise o vídeo @{video} e crie um título curto, criativo e impactante para redes sociais. O título deve ter no máximo 10 palavras e chamar muita atenção.",
        category: "análise",
        icon: "🎥",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    {
        id: "sys_analyze_image",
        title: "Descrever imagem",
        body: "Analise a imagem @{cover} e descreva com detalhes o que ela transmite visualmente e emocionalmente. Seja objetivo e criativo.",
        category: "análise",
        icon: "🖼️",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    {
        id: "sys_title_from_text",
        title: "Criar título a partir do texto",
        body: "A partir do seguinte texto, crie 3 opções de título para redes sociais. Cada título deve ser impactante e chamar atenção:\n\n@{body_text}",
        category: "análise",
        icon: "✨",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    // ── Legenda ──────────────────────────────────────────────
    {
        id: "sys_write_caption",
        title: "Criar legenda para post",
        body: "Crie uma legenda criativa e envolvente sobre o tema @{topic}. Use emojis relevantes e inclua uma chamada para ação ao final. Estilo: descontraído e autêntico.",
        category: "legenda",
        icon: "✍️",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    {
        id: "sys_write_hook",
        title: "Escrever hook de abertura",
        body: "Escreva um hook poderoso e irresistível para um Reels/TikTok sobre @{topic}. O hook deve prender a atenção nas primeiras 3 segundos. Crie 3 variações.",
        category: "legenda",
        icon: "🔥",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    {
        id: "sys_hashtags",
        title: "Gerar hashtags",
        body: "Gere 20 hashtags estratégicas para um post sobre @{topic}. Misture hashtags populares, médias e de nicho para maximizar o alcance.",
        category: "legenda",
        icon: "#️⃣",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    // ── Descrição ────────────────────────────────────────────
    {
        id: "sys_write_linkedin",
        title: "Texto para LinkedIn",
        body: "Com base no tema @{topic}, escreva um texto profissional e inspirador para o LinkedIn. O texto deve ter 3 parágrafos, ser autêntico, usar dados ou exemplos e terminar com uma pergunta para estimular comentários.",
        category: "descrição",
        icon: "💼",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    {
        id: "sys_write_youtube",
        title: "Descrição para YouTube",
        body: "Escreva uma descrição otimizada para SEO do vídeo @{video} sobre @{topic}. Inclua: parágrafo inicial com palavras-chave, timecodes (se aplicável), links relevantes e chamada para inscrição.",
        category: "descrição",
        icon: "▶️",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
    {
        id: "sys_write_bio",
        title: "Bio de perfil",
        body: "Crie uma bio criativa e profissional para perfil de redes sociais. O perfil é sobre @{topic}. A bio deve ser curta (máx. 150 caracteres), usar emojis e ter uma proposta de valor clara.",
        category: "descrição",
        icon: "👤",
        isSystem: true,
        createdAt: "2025-01-01T00:00:00Z",
    },
];

export const PROMPT_CATEGORIES = ["análise", "legenda", "descrição", "personalizado"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
    "análise": "Análise",
    "legenda": "Legenda",
    "descrição": "Descrição",
    "personalizado": "Meus Prompts",
};
