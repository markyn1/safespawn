"use client";

import { Zap, Crown, Check, MessageCircle, HelpCircle, ArrowRight, Play, Info, PlayCircle, Settings, FileText, ExternalLink, BookOpen, Video, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HELP_TOPICS = [
    {
        id: "intro",
        title: "Primeiros Passos",
        icon: PlayCircle,
        description: "Aprenda o básico para começar a criar hoje mesmo.",
        content: "O Feed Ready foi desenhado para ser intuitivo. No Dashboard, você pode colar uma URL de vídeo ou fazer upload de um arquivo bruto. A IA irá processar, legendar e formatar automaticamente para as redes sociais escolhidas.",
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ" // Placeholder
    },
    {
        id: "layouts",
        title: "Topografia de Tela & Layouts",
        icon: Settings,
        description: "Customize onde cada elemento aparece no vídeo.",
        content: "Na aba 'Layouts', você pode definir áreas seguras para legendas, logos e imagens estáticas. Use o editor visual para arrastar e redimensionar os elementos. Lembre-se de salvar os limites para que a IA respeite essas áreas durante a renderização.",
        links: [
            { label: "Documentação de Layouts", url: "/layout" }
        ]
    },
    {
        id: "designs",
        title: "Identidade Visual & Prompts",
        icon: FileText,
        description: "Ajuste o tom de voz e o estilo visual da IA.",
        content: "Na aba 'Designs', você tem controle total sobre o 'Cérebro' da aplicação. Você pode editar os prompts de sistema para mudar como a IA escreve suas legendas e ganchos (hooks). Também é possível fazer upload de fontes personalizadas (.ttf) e assets da marca.",
        video: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
        id: "tokens",
        title: "Consumo de Tokens & Planos",
        icon: Zap,
        description: "Entenda como o limite mensal funciona.",
        content: "Cada geração consome uma quantidade de tokens baseada na duração do vídeo e complexidade do processamento. Você pode acompanhar seu saldo em tempo real na Navbar. Se precisar de mais fôlego, visite a aba de Planos para fazer um upgrade.",
        links: [
            { label: "Ver Planos Disponíveis", url: "/billing" }
        ]
    }
];

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 md:px-8 flex flex-col items-center">
            <div className="max-w-4xl w-full space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-2">
                        <HelpCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight uppercase">Central de <span className="text-emerald-600">Ajuda</span></h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Tudo o que você precisa para dominar o <strong>Feed Ready</strong> e escalar sua produção de conteúdo.
                    </p>
                </div>

                {/* Main Topics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {HELP_TOPICS.map((topic) => (
                        <Card key={topic.id} className="border-border/50 hover:border-emerald-500/30 transition-all group overflow-hidden bg-card/50">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-muted group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <topic.icon className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-xl font-bold">{topic.title}</CardTitle>
                                </div>
                                <CardDescription>{topic.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {topic.content}
                                </p>

                                {topic.video && (
                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-black">
                                        <iframe
                                            src={topic.video}
                                            title={topic.title}
                                            className="absolute inset-0 w-full h-full"
                                            allowFullScreen
                                        />
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {topic.links?.map((link, idx) => (
                                        <Button key={idx} variant="outline" size="sm" asChild className="gap-2 h-8 text-xs font-bold uppercase tracking-tight">
                                            <a href={link.url}>
                                                {link.label} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* FAQ Section */}
                <div className="space-y-6 pt-8">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-2xl font-black tracking-tight uppercase">Perguntas Frequentes</h2>
                    </div>

                    <div className="space-y-4">
                        <Card className="border-border/50 bg-card/30">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight text-emerald-600">
                                    Quais formatos de vídeo são suportados?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Suportamos upload direto de arquivos .mp4, .mov e .webm. Para links externos, o Feed Ready é otimizado para Reels do Instagram e TikTok.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 bg-card/30">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight text-emerald-600">
                                    Posso exportar em 4K?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A resolução de exportação depende do seu plano. O plano Maestro suporta até 1080p com bitrates otimizados para redes sociais, garantindo que o vídeo não perca qualidade ao ser postado.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 bg-card/30">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight text-emerald-600">
                                    Como funciona o suporte humanizado?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Usuários dos planos Profissional e Maestro possuem acesso a um canal exclusivo no WhatsApp. Para os demais planos, o suporte é realizado via email com tempo de resposta de até 24h úteis.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Contact Footer */}
                <div className="bg-emerald-600 rounded-xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-2xl font-black tracking-tight uppercase">Ainda com dúvidas?</h3>
                        <p className="text-emerald-50/80 font-medium">Nossa equipe técnica está pronta para te atender.</p>
                    </div>
                    <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 font-black uppercase tracking-tight gap-2">
                        <MessageCircle className="w-5 h-5" /> Falar com Suporte
                    </Button>
                </div>
            </div>
        </div>
    );
}
