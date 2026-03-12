"use client";

import { useState, useMemo } from "react";
import type { Block } from "@/types/editor";
import { getAllVariables, getBlockVariableValue } from "@/lib/variables";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChevronDown, Image as ImageIcon, Video, Type, Check, Clapperboard, FileText } from "lucide-react";
import { ProtectedImage } from "@/components/ui/ProtectedImage";

export interface VariableInfo {
    name: string;
    value: string;
    blockId: string;
    blockType: Block["type"];
}

interface TokenChipProps {
    /** The token name as it appears in the prompt: @{tokenName} */
    tokenName: string;
    /** The currently bound variable name (may differ from tokenName if remapped) */
    boundTo: string | undefined;
    /** All blocks available as potential variable sources */
    blocks: Block[];
    onChange: (tokenName: string, boundVariableName: string) => void;
}

function getTypeIcon(type: Block["type"]) {
    if (type === "image" || type === "image_ia" || type === "logo")
        return <ImageIcon className="h-3 w-3 shrink-0" />;
    if (type === "video")
        return <Video className="h-3 w-3 shrink-0" />;
    if (type === "media_slot")
        return <Clapperboard className="h-3 w-3 shrink-0" />;
    if (type === "caption_ia")
        return <FileText className="h-3 w-3 shrink-0" />;
    return <Type className="h-3 w-3 shrink-0" />;
}

function isImageUrl(url: string) {
    return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url) || url.includes("/api/uploads/");
}

export function TokenChip({ tokenName, boundTo, blocks, onChange }: TokenChipProps) {
    const [open, setOpen] = useState(false);

    const availableVars: VariableInfo[] = useMemo(() => {
        return blocks
            .filter(b => !!b.variableName?.trim())
            .map(b => ({
                name: b.variableName!.trim(),
                value: getBlockVariableValue(b),
                blockId: b.id,
                blockType: b.type,
            }));
    }, [blocks]);

    const boundVar = boundTo ? availableVars.find(v => v.name === boundTo) : undefined;
    const hasValue = !!boundVar?.value;

    const chipState: "unbound" | "resolved" | "empty" = !boundVar
        ? "unbound"
        : hasValue ? "resolved" : "empty";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <span
                    className={cn(
                        "inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold cursor-pointer border select-none transition-all",
                        chipState === "resolved" && "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25",
                        chipState === "empty" && "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
                        chipState === "unbound" && "bg-red-500/15 border-red-400/50 text-red-700 dark:text-red-300 hover:bg-red-500/25",
                    )}
                    title={boundVar ? `Valor: ${boundVar.value || "(vazio)"}` : "Clique para vincular uma variável"}
                >
                    {chipState === "resolved" && getTypeIcon(boundVar!.blockType)}
                    <span>@&#123;{boundVar?.name ?? tokenName}&#125;</span>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </span>
            </PopoverTrigger>

            <PopoverContent className="w-72 p-0" side="bottom" align="start">
                <Command>
                    <CommandInput placeholder="Buscar variável..." className="h-9 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
                            Nenhuma variável encontrada.<br />
                            <span className="opacity-70">Adicione variáveis aos blocos no canvas.</span>
                        </CommandEmpty>

                        <CommandGroup heading="Variáveis disponíveis">
                            {availableVars.map(v => {
                                const isImg = isImageUrl(v.value);
                                const isSelected = boundTo === v.name;

                                return (
                                    <CommandItem
                                        key={v.name}
                                        value={v.name}
                                        onSelect={() => {
                                            onChange(tokenName, v.name);
                                            setOpen(false);
                                        }}
                                        className="flex items-center gap-2 py-2 cursor-pointer"
                                    >
                                        {/* Type icon */}
                                        <span className="text-muted-foreground shrink-0">
                                            {getTypeIcon(v.blockType)}
                                        </span>

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-mono font-semibold text-foreground">@&#123;{v.name}&#125;</p>
                                            {v.value ? (
                                                isImg ? (
                                                    <div className="mt-1 w-12 h-8 rounded overflow-hidden border border-border">
                                                        <ProtectedImage
                                                            src={v.value}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.value}</p>
                                                )
                                            ) : (
                                                <p className="text-[10px] text-amber-500 mt-0.5 italic">Bloco vazio</p>
                                            )}
                                        </div>

                                        {/* Selected check */}
                                        {isSelected && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
