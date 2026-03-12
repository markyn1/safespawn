"use client";

import { Prompt } from "@/types/prompts";
import { Button } from "@/components/ui/button";
import { Copy, Edit2, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptCardProps {
    prompt: Prompt;
    onUse: (prompt: Prompt) => void;
    onFork: (prompt: Prompt) => void;
    onEdit?: (prompt: Prompt) => void;
    onDelete?: (prompt: Prompt) => void;
    isActive?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    "análise": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "legenda": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    "descrição": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    "personalizado": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function PromptCard({ prompt, onUse, onFork, onEdit, onDelete, isActive }: PromptCardProps) {
    return (
        <div
            className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:border-emerald-500/40 hover:bg-card/80 transition-all cursor-pointer",
                isActive && "border-emerald-500 ring-1 ring-emerald-500/20"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {prompt.icon && (
                        <span className="text-base shrink-0">{prompt.icon}</span>
                    )}
                    <span className="text-xs font-semibold text-foreground truncate">{prompt.title}</span>
                </div>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", CATEGORY_COLORS[prompt.category])}>
                    {prompt.category}
                </span>
            </div>

            {/* Body preview */}
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {prompt.body.replace(/@\{([^}]+)\}/g, (_, name) => `‹${name}›`)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                <Button
                    size="sm"
                    className="h-7 text-[11px] gap-1 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={(e) => { e.stopPropagation(); onUse(prompt); }}
                >
                    <Play className="h-3 w-3" />
                    Usar
                </Button>

                {prompt.isSystem ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={(e) => { e.stopPropagation(); onFork(prompt); }}
                        title="Copiar e personalizar"
                    >
                        <Copy className="h-3 w-3" />
                        Fork
                    </Button>
                ) : (
                    <>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); onEdit?.(prompt); }}
                            title="Editar"
                        >
                            <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-500 hover:border-red-400"
                            onClick={(e) => { e.stopPropagation(); onDelete?.(prompt); }}
                            title="Deletar"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
