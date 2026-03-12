"use client";

import { useState, useRef, useEffect } from "react";
import type { Prompt, PromptCategory } from "@/types/prompts";
import type { Block } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllVariables, extractVariableRefs } from "@/lib/variables";
import { ArrowLeft, Save, Variable, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptEditorProps {
    initialPrompt?: Partial<Prompt>;
    blocks: Block[];
    onSave: (data: { title: string; body: string; category: PromptCategory }) => void;
    onCancel: () => void;
}

const CATEGORIES: { value: PromptCategory; label: string }[] = [
    { value: "análise", label: "Análise" },
    { value: "legenda", label: "Legenda" },
    { value: "descrição", label: "Descrição" },
    { value: "personalizado", label: "Personalizado" },
];

export function PromptEditor({ initialPrompt, blocks, onSave, onCancel }: PromptEditorProps) {
    const [title, setTitle] = useState(initialPrompt?.title ?? "");
    const [body, setBody] = useState(initialPrompt?.body ?? "");
    const [category, setCategory] = useState<PromptCategory>(initialPrompt?.category ?? "personalizado");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const availableVars = getAllVariables(blocks);
    const usedVars = extractVariableRefs(body);

    const getVarStatus = (name: string) => {
        return availableVars.some(v => v.name === name) ? "resolved" : "missing";
    };

    const insertVar = (varName: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = body.slice(0, start) + `@{${varName}}` + body.slice(end);
        setBody(newVal);
        setTimeout(() => {
            ta.focus();
            const newPos = start + varName.length + 3;
            ta.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const canSave = title.trim().length > 0 && body.trim().length > 0;

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
    }, [body]);

    // Render body with highlighted @{...} tokens
    const renderHighlighted = () => {
        return body.split(/@\{([^}]*)\}/g).map((part, i) => {
            if (i % 2 === 0) return <span key={i}>{part}</span>;
            const status = getVarStatus(part);
            return (
                <span
                    key={i}
                    className={cn(
                        "inline-flex items-center px-1 rounded text-[11px] font-mono font-medium",
                        status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/20 text-red-600 dark:text-red-400"
                    )}
                >
                    @{"{" + part + "}"}
                </span>
            );
        });
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-background text-foreground">
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 px-4 py-3 border-b border-border shadow-sm flex items-center gap-3">
                <button onClick={onCancel} className="p-1 rounded hover:bg-muted transition-colors">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div>
                    <h2 className="font-semibold text-sm">{initialPrompt?.id ? "Editar Prompt" : "Novo Prompt"}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {initialPrompt?.forkedFrom ? "Baseado em prompt do sistema" : "Criado por você"}
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Title */}
                <div className="space-y-1.5">
                    <Label htmlFor="prompt-title" className="text-xs font-medium">Título</Label>
                    <Input
                        id="prompt-title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Analisar vídeo e gerar título"
                        className="h-9 text-sm"
                    />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Categoria</Label>
                    <Select value={category} onValueChange={v => setCategory(v as PromptCategory)}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Body Textarea */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Prompt</Label>
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Escreva seu prompt aqui. Use @{variavel} para referenciar variáveis dos blocos.&#10;&#10;Ex: Analise o vídeo @{video} e gere um título impactante."
                            className="w-full min-h-[140px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono leading-relaxed"
                            spellCheck={false}
                        />
                    </div>
                    {/* Variable highlight preview */}
                    {usedVars.length > 0 && (
                        <div className="mt-2 p-3 rounded-md bg-muted/40 border border-border/60">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Variáveis usadas</p>
                            <div className="flex flex-wrap gap-1.5">
                                {usedVars.map(varName => {
                                    const status = getVarStatus(varName);
                                    return (
                                        <span
                                            key={varName}
                                            className={cn(
                                                "inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border",
                                                status === "resolved"
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                                    : "bg-red-500/10 border-red-400/30 text-red-500"
                                            )}
                                        >
                                            {status === "resolved"
                                                ? <CheckCircle2 className="h-2.5 w-2.5" />
                                                : <AlertCircle className="h-2.5 w-2.5" />
                                            }
                                            @{"{" + varName + "}"}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Available Variables Chips */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Variable className="h-3.5 w-3.5 text-emerald-500" />
                        <Label className="text-xs font-medium">Variáveis disponíveis</Label>
                    </div>
                    {availableVars.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                            Nenhum bloco com variável definida. Selecione um bloco e defina um nome de variável no painel de propriedades.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {availableVars.map(v => (
                                <button
                                    key={v.name}
                                    onClick={() => insertVar(v.name)}
                                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                                    title={`Valor atual: ${v.value || "(vazio)"}`}
                                >
                                    @{"{" + v.name + "}"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    disabled={!canSave}
                    onClick={() => onSave({ title: title.trim(), body: body.trim(), category })}
                >
                    <Save className="h-3.5 w-3.5" />
                    Salvar
                </Button>
            </div>
        </div>
    );
}
