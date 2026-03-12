"use client";

import { useState, useMemo, useCallback } from "react";
import type { Block, AITextBlock } from "@/types/editor";
import type { Prompt } from "@/types/prompts";
import { systemPrompts, CATEGORY_LABELS } from "@/lib/systemPrompts";
import { extractVariableRefs, buildVariableMap, resolveVariables, getAllVariables } from "@/lib/variables";
import { TokenChip } from "./TokenChip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    "análise": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "legenda": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    "descrição": "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    "personalizado": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

function USER_PROMPTS_KEY() {
    try { return JSON.parse(localStorage.getItem("cc_user_prompts") ?? "[]") as Prompt[]; }
    catch { return []; }
}

// Splits a prompt body into alternating [text, tokenName, text, tokenName, ...] parts
function splitByTokens(body: string): Array<{ type: "text" | "token"; value: string }> {
    const parts: Array<{ type: "text" | "token"; value: string }> = [];
    let last = 0;
    const regex = /@\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(body)) !== null) {
        if (m.index > last) parts.push({ type: "text", value: body.slice(last, m.index) });
        parts.push({ type: "token", value: m[1] });
        last = m.index + m[0].length;
    }
    if (last < body.length) parts.push({ type: "text", value: body.slice(last) });
    return parts;
}

// ── Props ──────────────────────────────────────────────────

export interface PromptSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    blocks: Block[];
    /** Called when user confirms a prompt with fully-resolved bindings */
    onApply: (data: Pick<AITextBlock["payload"], "prompt" | "promptId" | "variableBindings">) => void;
    /** Current block payload to pre-populate */
    initialPayload?: AITextBlock["payload"];
}

// ── Component ──────────────────────────────────────────────

export function PromptSelectorModal({
    open,
    onOpenChange,
    blocks,
    onApply,
    initialPayload,
}: PromptSelectorModalProps) {
    const [view, setView] = useState<"list" | "preview">("list");
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    // bindings: token name in prompt → block variableName chosen by user
    const [bindings, setBindings] = useState<Record<string, string>>({});

    const allPrompts = useMemo(() => {
        const user = typeof window !== "undefined" ? USER_PROMPTS_KEY() : [];
        return [...systemPrompts, ...user];
    }, [open]); // refresh when modal opens

    const availableVars = useMemo(() => getAllVariables(blocks), [blocks]);
    const variableMap = useMemo(() => buildVariableMap(blocks), [blocks]);

    // When a prompt is selected, auto-bind tokens whose name matches an existing variable
    const handleSelectPrompt = useCallback((p: Prompt) => {
        const tokens = extractVariableRefs(p.body);
        const autoBindings: Record<string, string> = {};
        tokens.forEach(tok => {
            if (availableVars.some(v => v.name === tok)) {
                autoBindings[tok] = tok; // auto-resolve if name matches
            }
        });
        // Restore prior bindings if same prompt
        if (initialPayload?.promptId === p.id && initialPayload.variableBindings) {
            Object.assign(autoBindings, initialPayload.variableBindings);
        }
        setBindings(autoBindings);
        setSelectedPrompt(p);
        setView("preview");
    }, [availableVars, initialPayload]);

    const handleBindingChange = useCallback((tokenName: string, variableName: string) => {
        setBindings(prev => ({ ...prev, [tokenName]: variableName }));
    }, []);

    // tokens in the selected prompt
    const tokens = selectedPrompt ? extractVariableRefs(selectedPrompt.body) : [];

    // A token is "resolved" if it has a binding AND that variable has a non-empty value
    const isTokenResolved = (tok: string) => {
        const boundVar = bindings[tok];
        if (!boundVar) return false;
        return availableVars.some(v => v.name === boundVar && v.value);
    };

    const allResolved = tokens.length === 0 || tokens.every(isTokenResolved);
    const resolvedCount = tokens.filter(isTokenResolved).length;

    // Build the final resolved prompt string for preview/apply
    const resolvedBody = useMemo(() => {
        if (!selectedPrompt) return "";
        // Replace tokens with bound variable values
        const boundMap = new Map<string, string>();
        Object.entries(bindings).forEach(([tok, varName]) => {
            const v = availableVars.find(av => av.name === varName);
            if (v) boundMap.set(tok, v.value);
        });
        return selectedPrompt.body.replace(/@\{([^}]+)\}/g, (match, name) =>
            boundMap.has(name) ? boundMap.get(name)! : match
        );
    }, [selectedPrompt, bindings, availableVars]);

    const handleApply = () => {
        if (!selectedPrompt) return;
        onApply({
            prompt: resolvedBody,
            promptId: selectedPrompt.id,
            variableBindings: bindings,
        });
        onOpenChange(false);
    };

    const handleBack = () => {
        setView("list");
        setSelectedPrompt(null);
        setBindings({});
    };

    const handleClose = (o: boolean) => {
        if (!o) { setView("list"); setSelectedPrompt(null); setBindings({}); }
        onOpenChange(o);
    };

    // Group prompts by category
    const grouped = useMemo(() => {
        const categories = ["análise", "legenda", "descrição", "personalizado"] as const;
        return categories.map(cat => ({
            cat,
            items: allPrompts.filter(p => p.category === cat),
        })).filter(g => g.items.length > 0);
    }, [allPrompts]);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* ── Header ──────────────────────────────────── */}
                <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        {view === "preview" && (
                            <button
                                onClick={handleBack}
                                className="p-1 rounded hover:bg-muted transition-colors -ml-1"
                            >
                                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                            </button>
                        )}
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        {view === "list" ? "Selecionar Prompt de IA" : selectedPrompt?.title}
                        {view === "preview" && selectedPrompt && (
                            <Badge className={cn("ml-auto text-[10px] border font-medium", CATEGORY_COLORS[selectedPrompt.category])}>
                                {selectedPrompt.category}
                            </Badge>
                        )}
                    </DialogTitle>
                    {view === "preview" && tokens.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {resolvedCount}/{tokens.length} variáveis vinculadas
                            {" · "}Clique nos chips coloridos para vincular uma variável a cada token
                        </p>
                    )}
                </DialogHeader>

                {/* ── Body ────────────────────────────────────── */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {view === "list" ? (
                        /* ── LIST VIEW ── */
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-6">
                                {grouped.map(({ cat, items }) => (
                                    <section key={cat}>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                            {CATEGORY_LABELS[cat]}
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {items.map(p => {
                                                const toks = extractVariableRefs(p.body);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => handleSelectPrompt(p)}
                                                        className="group text-left flex gap-3 p-3 rounded-lg border border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                                                    >
                                                        <span className="text-xl shrink-0 mt-0.5">{p.icon ?? "✨"}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                                                                {!p.isSystem && (
                                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
                                                                        Seu prompt
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                                                {p.body.replace(/@\{([^}]+)\}/g, "‹$1›")}
                                                            </p>
                                                            {toks.length > 0 && (
                                                                <div className="flex gap-1 flex-wrap mt-2">
                                                                    {toks.map(t => (
                                                                        <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                                                            @{"{" + t + "}"}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        /* ── PREVIEW VIEW ── */
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-4">
                                {/* Resolution status bar */}
                                {tokens.length > 0 && (
                                    <div className={cn(
                                        "flex items-center gap-2 p-3 rounded-lg border text-xs",
                                        allResolved
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                            : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                                    )}>
                                        {allResolved
                                            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                            : <Clock className="h-3.5 w-3.5 shrink-0" />
                                        }
                                        {allResolved
                                            ? "Todas as variáveis estão vinculadas. Pronto para aplicar!"
                                            : `Vincule as variáveis em vermelho para habilitar "Aplicar".`
                                        }
                                    </div>
                                )}

                                {/* No variables needed */}
                                {tokens.length === 0 && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                        Este prompt não usa variáveis — pode aplicar diretamente.
                                    </div>
                                )}

                                {/* Prompt body with interactive token chips */}
                                <div className="p-4 rounded-xl border border-border bg-muted/30 text-sm leading-8 whitespace-pre-wrap break-words">
                                    {selectedPrompt && splitByTokens(selectedPrompt.body).map((part, i) => {
                                        if (part.type === "text") {
                                            return <span key={i}>{part.value}</span>;
                                        }
                                        return (
                                            <TokenChip
                                                key={i}
                                                tokenName={part.value}
                                                boundTo={bindings[part.value]}
                                                blocks={blocks}
                                                onChange={handleBindingChange}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Resolved preview */}
                                {allResolved && tokens.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Preview resolvido
                                        </p>
                                        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                            {resolvedBody}
                                        </div>
                                    </div>
                                )}

                                {/* Variable reference legend */}
                                {availableVars.length > 0 && (
                                    <div className="pt-2 border-t border-border/50">
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                            Variáveis nos seus blocos
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableVars.map(v => (
                                                <span key={v.name} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground">
                                                    @{"{" + v.name + "}"}
                                                    {v.value && (
                                                        <span className="text-foreground/60 max-w-[80px] truncate">
                                                            → {v.value}
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {/* ── Footer (preview only) ────────────────── */}
                {view === "preview" && (
                    <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleBack}>
                            Voltar
                        </Button>
                        <Button
                            size="sm"
                            className={cn(
                                "ml-auto gap-1.5",
                                allResolved
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "opacity-50 cursor-not-allowed"
                            )}
                            disabled={!allResolved}
                            onClick={handleApply}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Aplicar ao Bloco
                            {tokens.length > 0 && !allResolved && (
                                <span className="text-xs opacity-80">
                                    ({resolvedCount}/{tokens.length})
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
