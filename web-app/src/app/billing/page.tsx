"use client";

import { useState, useEffect } from "react";
import { Zap, Crown, Star, Shield, Check, Info } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface UserProfile {
    id: number;
    username: string;
    plan: string;
    limit: number;
    usage: number;
}

const TIER_BENEFITS = {
    gratuito: [
        { title: "Tokens Mensais", desc: "1.000 tokens para começar a criar hoje." },
        { title: "Templates", desc: "Acesso total aos templates básicos da plataforma." },
        { title: "Suporte", desc: "Acesso ao canal da comunidade no Discord." }
    ],
    starter: [
        { title: "Tokens Mensais", desc: "200.000 tokens para produção recorrente." },
        { title: "Sem Marca d'Água", desc: "Exporte seus vídeos limpos e profissionais." },
        { title: "Fontes Premium", desc: "Acesso a 10 fontes exclusivas para legenda." },
        { title: "Suporte", desc: "Suporte prioritário via email em até 24h." }
    ],
    profissional: [
        { title: "Tokens Mensais", desc: "600.000 tokens para criadores frequentes." },
        { title: "Renderização Rápida", desc: "Processamento via Silicon de alta performance." },
        { title: "Formatos Infinitos", desc: "Crie em qualquer proporção de tela sem limites." },
        { title: "Customização Total", desc: "Upload de fontes (.ttf) e assets da sua marca." },
        { title: "Suporte VIP", desc: "Acesso direto à equipe via WhatsApp Dedicado." }
    ],
    maestro: [
        { title: "Tokens Ilimitados", desc: "10.000.000 tokens para dominar o mercado." },
        { title: "Early Access", desc: "Acesso antecipado a novos modelos de IA." },
        { title: "Treinamento VIP", desc: "Call mensal de estratégia com nossos especialistas." },
        { title: "Fila Prioritária", desc: "Seus vídeos são renderizados antes de todos." }
    ],
};

const TIER_DETAILS = {
    gratuito: { subtitle: "Para quem está começando", originalPrice: "R$ 0", price: "0" },
    starter: { subtitle: "Para criadores individuais", originalPrice: "R$ 49", price: "39" },
    profissional: { subtitle: "Para profissionais e agencies", originalPrice: "R$ 147", price: "97" },
    maestro: { subtitle: "Para operações de larga escala", originalPrice: "R$ 997", price: "497" },
};

export default function BillingPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "/auth";
                return;
            }

            try {
                const res = await fetch("http://localhost:8000/api/auth/me", {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                } else {
                    toast.error("Falha ao carregar perfil.");
                }
            } catch (err) {
                console.error(err);
                toast.error("Erro de conexão.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!profile) return null;

    const usagePercentage = Math.min((profile.usage / profile.limit) * 100, 100);
    const isOverLimit = profile.usage >= profile.limit;

    // UI Formatters
    const planNameDisplay = profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1);

    // Dynamic color based on the plan
    const getPlanColor = (plan: string) => {
        switch (plan.toLowerCase()) {
            case "gratuito": return "text-zinc-400";
            case "starter": return "text-emerald-500";
            case "profissional": return "text-emerald-600";
            case "maestro": return "text-amber-400";
            default: return "text-zinc-400";
        }
    };

    const getPlanIcon = (plan: string) => {
        switch (plan.toLowerCase()) {
            case "gratuito": return <Shield className="w-8 h-8 text-zinc-400" />;
            case "starter": return <Star className="w-8 h-8 text-emerald-500" />;
            case "profissional": return <Zap className="w-8 h-8 text-emerald-700" />;
            case "maestro": return <Crown className="w-8 h-8 text-amber-400" />;
            default: return <Shield className="w-8 h-8 text-zinc-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 md:px-8 flex flex-col items-center">
            <Toaster position="top-right" />

            <div className="max-w-7xl w-full">
                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="text-5xl font-black tracking-tighter uppercase mb-4">
                        Feed <span className="text-emerald-500">Ready</span> Faça Parte Do Time
                    </h1>
                    <p className="text-muted-foreground text-lg">Impulsione sua produção com inteligência artificial de elite.</p>
                </div>

                {/* Dashboard Usage Card */}
                <Card className="mb-16 border-border/50 bg-zinc-950/50 backdrop-blur-xl overflow-hidden shadow-2xl">
                    <CardContent className="p-10">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                            {/* Current Plan Info */}
                            <div className="flex items-center gap-8">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.2em]">Status da Assinatura</p>
                                    <h2 className={`text-4xl font-black uppercase tracking-tight ${getPlanColor(profile.plan)}`}>
                                        Plano {planNameDisplay}
                                    </h2>
                                </div>
                            </div>

                            {/* Usage Progress */}
                            <div className="flex-1 w-full max-w-xl bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Uso de Tokens no Ciclo</p>
                                        <p className="text-3xl font-black tracking-tight">
                                            {profile.usage.toLocaleString("pt-BR")}
                                            <span className="text-sm text-zinc-500 font-bold ml-2">/ {profile.limit.toLocaleString("pt-BR")} TOKENS</span>
                                        </p>
                                    </div>
                                    <span className={`text-sm font-black p-2 rounded-lg bg-zinc-900 border border-white/5 ${isOverLimit ? "text-destructive" : "text-emerald-500"}`}>
                                        {usagePercentage.toFixed(0)}%
                                    </span>
                                </div>

                                <Progress value={usagePercentage} className="h-3 bg-zinc-800 progress-solid" />

                                {isOverLimit && (
                                    <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center gap-3">
                                        <Info className="w-4 h-4 text-destructive" />
                                        <p className="text-destructive text-xs font-bold uppercase tracking-tight">Limite atingido. Faça upgrade para continuar gerando.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing Tiers Grid */}
                <div className="space-y-8 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-border flex-1" />
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Escolha seu novo nível</h3>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {["gratuito", "starter", "profissional", "maestro"].map((tierType) => {
                            const isCurrent = profile.plan.toLowerCase() === tierType;
                            const details = TIER_DETAILS[tierType as keyof typeof TIER_DETAILS];
                            const benefits = TIER_BENEFITS[tierType as keyof typeof TIER_BENEFITS];

                            return (
                                <Card
                                    key={tierType}
                                    className={`flex flex-col bg-zinc-950 border-border/50 transition-all duration-300 relative group overflow-hidden ${isCurrent ? "ring-2 ring-emerald-500" : "hover:border-emerald-500/50"}`}
                                >
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                                            {tierType}
                                        </CardTitle>
                                        <CardDescription className="text-zinc-500 font-medium text-xs uppercase tracking-wider mb-6">
                                            {details.subtitle}
                                        </CardDescription>

                                        <div className="flex items-baseline gap-3 mb-2">
                                            <span className="text-zinc-600 line-through text-lg font-bold">
                                                {details.originalPrice}
                                            </span>
                                            <span className="text-5xl font-black text-white tracking-tighter">
                                                R$ {details.price}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Cobrança Mensal</span>
                                    </CardHeader>

                                    <CardContent className="p-8 pt-4 space-y-8 flex-1">
                                        <Button
                                            disabled={isCurrent}
                                            className={`w-full h-12 font-black uppercase tracking-widest text-xs transition-all ${isCurrent
                                                ? "bg-zinc-800 text-zinc-500 cursor-default"
                                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/20 active:scale-[0.98]"
                                                }`}
                                        >
                                            {isCurrent ? "Plano Atual" : "Upgrade Agora"}
                                        </Button>

                                        <div className="space-y-6">
                                            {benefits.map((benefit, i) => (
                                                <div key={i} className="flex gap-4">
                                                    <div className="mt-1">
                                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-black uppercase tracking-tight text-zinc-100">
                                                            {benefit.title}
                                                        </p>
                                                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                                            {benefit.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

