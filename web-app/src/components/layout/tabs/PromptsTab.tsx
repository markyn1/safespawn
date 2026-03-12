"use client";

import { useState, useCallback, useMemo } from "react";
import type { Block } from "@/types/editor";
import type { Prompt, PromptCategory } from "@/types/prompts";
import { systemPrompts, CATEGORY_LABELS } from "@/lib/systemPrompts";
import { resolveVariables, buildVariableMap } from "@/lib/variables";
import { PromptCard } from "./PromptCard";
import { PromptEditor } from "./PromptEditor";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCopy, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const USER_PROMPTS_KEY = "cc_user_prompts";

function loadUserPrompts(): Prompt[] {
    try {
        const raw = localStorage.getItem(USER_PROMPTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveUserPrompts(prompts: Prompt[]) {
    try {
        localStorage.setItem(USER_PROMPTS_KEY, JSON.stringify(prompts));
    } catch { }
}

export interface PromptsTabProps {
    blocks: Block[];
}

type View = "list" | "edit" | "new";

export function PromptsTab({ blocks }: PromptsTabProps) {
    const [view, setView] = useState<View>("list");
    const [editingPrompt, setEditingPrompt] = useState<Partial<Prompt> | null>(null);
    const [userPrompts, setUserPrompts] = useState<Prompt[]>(() => loadUserPrompts());
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const variableMap = useMemo(() => buildVariableMap(blocks), [blocks]);

    // ── Handlers ──────────────────────────────────────────
    const handleUse = useCallback((prompt: Prompt) => {
        const resolved = resolveVariables(prompt.body, variableMap);
        navigator.clipboard.writeText(resolved).then(() => {
            setCopiedId(prompt.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    }, [variableMap]);

    const handleFork = useCallback((prompt: Prompt) => {
        setEditingPrompt({
            title: `${prompt.title} (cópia)`,
            body: prompt.body,
            category: prompt.category as PromptCategory,
            forkedFrom: prompt.id,
            isSystem: false,
        });
        setView("edit");
    }, []);

    const handleEdit = useCallback((prompt: Prompt) => {
        setEditingPrompt(prompt);
        setView("edit");
    }, []);

    const handleDelete = useCallback((prompt: Prompt) => {
        setUserPrompts(prev => {
            const updated = prev.filter(p => p.id !== prompt.id);
            saveUserPrompts(updated);
            return updated;
        });
    }, []);

    const handleNew = useCallback(() => {
        setEditingPrompt(null);
        setView("new");
    }, []);

    const handleSave = useCallback((data: { title: string; body: string; category: PromptCategory }) => {
        setUserPrompts(prev => {
            let updated: Prompt[];
            if (editingPrompt?.id) {
                // Update existing
                updated = prev.map(p =>
                    p.id === editingPrompt.id
                        ? { ...p, ...data }
                        : p
                );
            } else {
                // Create new
                const newPrompt: Prompt = {
                    ...data,
                    id: `user_${Date.now()}`,
                    icon: "⚡",
                    isSystem: false,
                    forkedFrom: editingPrompt?.forkedFrom,
                    createdAt: new Date().toISOString(),
                };
                updated = [...prev, newPrompt];
            }
            saveUserPrompts(updated);
            return updated;
        });
        setView("list");
        setEditingPrompt(null);
    }, [editingPrompt]);

    const toggleCategory = useCallback((cat: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    }, []);

    // ── Derived ───────────────────────────────────────────
    const allCategories = ["análise", "legenda", "descrição"] as const;
    const sysGrouped = useMemo(() => {
        return allCategories.map(cat => ({
            cat,
            items: systemPrompts.filter(p => p.category === cat),
        }));
    }, []);

    // ── Views ─────────────────────────────────────────────
    if (view === "edit" || view === "new") {
        return (
            <PromptEditor
                initialPrompt={editingPrompt ?? undefined}
                blocks={blocks}
                onSave={handleSave}
                onCancel={() => { setView("list"); setEditingPrompt(null); }}
            />
        );
    }

    return (
        <div className="flex flex-col flex-1 h-full min-h-0 bg-background text-foreground">
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 px-4 py-3 border-b border-border shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-sm">Prompts de IA</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Use ou personalize para gerar conteúdo</p>
                </div>
                <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={handleNew}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Novo
                </Button>
            </div>

            {/* Copy feedback banner */}
            {copiedId && (
                <div className="mx-4 mt-3 flex items-center gap-2 py-2 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    Prompt copiado para a área de transferência!
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                {/* System categories */}
                {sysGrouped.map(({ cat, items }) => {
                    const isCollapsed = collapsedCategories.has(cat);
                    return (
                        <section key={cat}>
                            <button
                                className="flex items-center gap-1 w-full text-left mb-2 group"
                                onClick={() => toggleCategory(cat)}
                            >
                                {isCollapsed
                                    ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                }
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                                    {CATEGORY_LABELS[cat]}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 ml-1">({items.length})</span>
                            </button>
                            {!isCollapsed && (
                                <div className="space-y-2">
                                    {items.map(prompt => (
                                        <PromptCard
                                            key={prompt.id}
                                            prompt={prompt}
                                            onUse={handleUse}
                                            onFork={handleFork}
                                            isActive={copiedId === prompt.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    );
                })}

                {/* User prompts */}
                <section>
                    <button
                        className="flex items-center gap-1 w-full text-left mb-2 group"
                        onClick={() => toggleCategory("personalizado")}
                    >
                        {collapsedCategories.has("personalizado")
                            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider group-hover:text-emerald-500 transition-colors">
                            {CATEGORY_LABELS["personalizado"]}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 ml-1">({userPrompts.length})</span>
                    </button>

                    {!collapsedCategories.has("personalizado") && (
                        <div className="space-y-2">
                            {userPrompts.length === 0 ? (
                                <div className="py-6 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                                    <p className="text-xs text-center max-w-[200px]">
                                        Nenhum prompt personalizado ainda.<br />
                                        <span className="opacity-70">Clique em "Novo" ou faça fork de um existente.</span>
                                    </p>
                                </div>
                            ) : (
                                userPrompts.map(prompt => (
                                    <PromptCard
                                        key={prompt.id}
                                        prompt={prompt}
                                        onUse={handleUse}
                                        onFork={handleFork}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        isActive={copiedId === prompt.id}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
