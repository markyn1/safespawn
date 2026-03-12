"use client";
import { useState } from "react";

import { BlockType, Block } from "@/types/editor";
import {
    Type,
    Image as ImageIcon,
    Square,
    Sticker,
    MessageSquare,
    Sparkles,
    Trash2,
    Video,
    FileText,
    Clapperboard,
    Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BlockOption {
    type: BlockType;
    label: string;
    icon: any;
    description: string;
    category: "basic" | "ai";
}

const BLOCK_OPTIONS: BlockOption[] = [
    // ── Hero — shown separately at top ────────────────
    {
        type: "media_slot",
        label: "Slot de Mídia",
        icon: Clapperboard,
        description: "Reserva o espaço do vídeo/imagem principal. Preenchido automaticamente no processamento.",
        category: "basic",
    },
    // ── Basics ─────────────────────────────────────────
    {
        type: "video",
        label: "Vídeo",
        icon: Video,
        description: "Vídeo de suporte com URL ou upload.",
        category: "basic",
    },
    {
        type: "text",
        label: "Texto",
        icon: Type,
        description: "Adicione títulos ou parágrafos customizáveis.",
        category: "basic",
    },
    {
        type: "image",
        label: "Imagem",
        icon: ImageIcon,
        description: "Envie ou escolha fotos da galeria.",
        category: "basic",
    },
    {
        type: "shape",
        label: "Forma",
        icon: Square,
        description: "Retângulos, círculos e outros elementos geométricos.",
        category: "basic",
    },
    {
        type: "logo",
        label: "Logo",
        icon: Sticker,
        description: "Insira logos da marca ou ícones.",
        category: "basic",
    },
    // ── AI ─────────────────────────────────────────────
    {
        type: "text_ia",
        label: "Texto IA",
        icon: MessageSquare,
        description: "Gere títulos e chamadas usando inteligência artificial.",
        category: "ai",
    },
    {
        type: "image_ia",
        label: "Imagem IA",
        icon: Sparkles,
        description: "Crie imagens únicas a partir de descrições em texto.",
        category: "ai",
    },
    {
        type: "caption_ia",
        label: "Legenda IA",
        icon: FileText,
        description: "Gera a descrição da postagem com IA. Não aparece na imagem.",
        category: "ai",
    },
];

interface BlocksTabProps {
    onAddBlock: (type: BlockType) => void;
    onUpdateBlock: (id: string, updates: Partial<Block>) => void;
    blocks: Block[];
    selectedBlockId: string | null;
    onSelectBlock: (id: string) => void;
    onReorderBlocks: (fromIndex: number, toIndex: number) => void;
    onRemoveBlock: (id: string) => void;
}

export function BlocksTab({ onAddBlock, onUpdateBlock, blocks, selectedBlockId, onSelectBlock, onReorderBlocks, onRemoveBlock }: BlocksTabProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const basicBlocks = BLOCK_OPTIONS.filter((b) => b.category === "basic");
    const aiBlocks = BLOCK_OPTIONS.filter((b) => b.category === "ai");
    const hasMediaSlot = blocks.some(b => b.type === "media_slot");

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-semibold text-foreground">Adicionar Blocos</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Clique para inserir novos elementos no seu design.
                </p>
            </div>

            {/* ── Hero: Media Slot ─────────────────────── */}
            <section className="space-y-2">
                <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clapperboard className="h-3 w-3" />
                    Conteúdo Principal
                </h3>
                <button
                    type="button"
                    onClick={() => !hasMediaSlot && onAddBlock("media_slot")}
                    disabled={hasMediaSlot}
                    className={cn(
                        "w-full group flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed transition-all",
                        hasMediaSlot
                            ? "border-amber-500/15 bg-amber-500/[0.02] opacity-60 cursor-not-allowed"
                            : "border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/60 hover:bg-amber-500/[0.08] cursor-pointer"
                    )}
                >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Clapperboard className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-foreground">Slot de Mídia</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                            {hasMediaSlot
                                ? "Já adicionado ao template."
                                : "Define o espaço do vídeo/imagem do usuário. Preenchido no processamento."
                            }
                        </p>
                    </div>
                    {hasMediaSlot && (
                        <span className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full shrink-0">
                            1 / 1
                        </span>
                    )}
                </button>
            </section>

            <section className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Básico
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {basicBlocks.filter(b => b.type !== "media_slot").map((block) => (
                        <BlockTypeCard
                            key={block.type}
                            block={block}
                            onClick={() => onAddBlock(block.type)}
                        />
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Inteligência Artificial
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {aiBlocks.map((block) => (
                        <BlockTypeCard
                            key={block.type}
                            block={block}
                            isAI
                            onClick={() => onAddBlock(block.type)}
                        />
                    ))}
                </div>
            </section>

            {blocks.length > 0 && (
                <>
                    <div className="h-px bg-border my-2" />
                    <section className="space-y-3 pb-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Camadas na Tela
                        </h3>
                        <div className="flex flex-col">
                            {blocks.map((block, index) => {
                                const isSelected = selectedBlockId === block.id;
                                const BlockIcon = getIconForBlockType(block.type);
                                const isDragged = draggedIndex === index;
                                const isDragOver = dragOverIndex === index;

                                return (
                                    <div
                                        key={block.id}
                                        draggable
                                        onDragStart={(e) => {
                                            setDraggedIndex(index);
                                            e.dataTransfer.effectAllowed = "move";
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault(); // Necessary to allow drop
                                            e.dataTransfer.dropEffect = "move";
                                            if (draggedIndex !== null && draggedIndex !== index) {
                                                setDragOverIndex(index);
                                            }
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            // Ignore leave events if hovering over child elements like text or icons
                                            if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
                                                return;
                                            }
                                            if (dragOverIndex === index) {
                                                setDragOverIndex(null);
                                            }
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggedIndex !== null && draggedIndex !== index) {
                                                onReorderBlocks(draggedIndex, index);
                                            }
                                            setDraggedIndex(null);
                                            setDragOverIndex(null);
                                        }}
                                        onDragEnd={() => {
                                            setDraggedIndex(null);
                                            setDragOverIndex(null);
                                        }}
                                        className={cn(
                                            "relative rounded-md transition-all py-0.5",
                                            isDragged && "opacity-40 ring-2 ring-emerald-500",
                                            isDragOver && draggedIndex !== null && draggedIndex !== index && "bg-emerald-500/10 scale-[1.02]"
                                        )}
                                    >
                                        {/* Indicador visual de onde o item será solto (linha grossa) */}
                                        {isDragOver && draggedIndex !== null && draggedIndex !== index && (
                                            <div
                                                className={cn(
                                                    "absolute left-0 right-0 h-1 bg-emerald-500 z-10 rounded-full",
                                                    draggedIndex > index ? "top-0" : "bottom-0"
                                                )}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onSelectBlock(block.id)}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                                                isSelected
                                                    ? "bg-emerald-500/10 text-emerald-600 font-medium"
                                                    : "hover:bg-accent text-foreground"
                                            )}
                                        >
                                            <BlockIcon className={cn(
                                                "h-4 w-4 shrink-0",
                                                isSelected ? "text-emerald-500" : "text-muted-foreground"
                                            )} />
                                            <span className="truncate flex-1">{block.title || "Bloco sem nome"}</span>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div
                                                            role="button"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 text-muted-foreground rounded transition-all"
                                                            title="Renomear camada"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-60 p-3" side="right" align="start" onClick={(e) => e.stopPropagation()}>
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium text-sm leading-none">Renomear Bloco</h4>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    defaultValue={block.title}
                                                                    autoFocus
                                                                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            const val = e.currentTarget.value.trim();
                                                                            if (val) onUpdateBlock(block.id, { title: val });
                                                                            document.body.click();
                                                                        }
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const val = e.currentTarget.value.trim();
                                                                        if (val) onUpdateBlock(block.id, { title: val });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <div
                                                    role="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveBlock(block.id);
                                                    }}
                                                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded transition-all"
                                                    title="Excluir camada"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

function getIconForBlockType(type: BlockType) {
    const option = BLOCK_OPTIONS.find(o => o.type === type);
    return option ? option.icon : Square;
}

function BlockTypeCard({
    block,
    onClick,
    isAI
}: {
    block: BlockOption;
    onClick: () => void;
    isAI?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-background transition-all hover:border-emerald-500/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                isAI && "border-emerald-500/20 bg-emerald-500/[0.02]"
            )}
        >
            <block.icon className={cn(
                "h-6 w-6 mb-2 transition-colors",
                isAI ? "text-emerald-500" : "text-muted-foreground group-hover:text-emerald-500"
            )} />
            <span className="text-xs font-semibold">{block.label}</span>
            {isAI && (
                <p className="text-[10px] text-muted-foreground text-center mt-1 leading-tight px-2">
                    {block.description}
                </p>
            )}
        </button>
    );
}
