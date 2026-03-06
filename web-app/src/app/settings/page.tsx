"use client";

import { Navbar } from "@/components/Navbar";

export default function FormatSettingsPage() {
    return (
        <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-sans text-foreground">
            <Navbar />

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
