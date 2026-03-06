"use client";
import { useEffect, useState } from "react";
import type { Resolution } from "@/types/settings";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";

export default function FormatSettingsPage() {
    const [resolutions, setResolutions] = useState<Resolution[]>([]);

    useEffect(() => {
        fetchResolutions();
    }, []);

    const fetchResolutions = async () => {
        const res = await api.get("/resolutions");
        setResolutions(res.data);
    };

    return (
        <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-sans text-foreground">
            <Navbar />
            {resolutions.map((resolution) => (
                <div key={resolution.id}>
                    <h2>{resolution.name}</h2>
                    <p>{resolution.proportion}</p>
                    <p>{resolution.width}</p>
                    <p>{resolution.height}</p>
                </div>
            ))}

            <header className="flex-none h-16 mt-20 px-6 border-b border-border bg-background flex items-center z-20 shrink-0">
                <h1 className="text-xl font-black text-emerald-600 uppercase tracking-tighter">
                    Configuração de <span className="text-foreground">Layout</span>
                </h1>
            </header>

            <main className="flex-1 flex items-center justify-center p-8">
                <p className="text-muted-foreground">Conteúdo em construção.</p>
            </main>
        </div>
    );
}
