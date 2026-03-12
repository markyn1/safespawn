"use client";

import { useState, useMemo } from "react";
import type { Resolution } from "@/types/settings";
import type { Template } from "@/types/editor";
import { TemplateOwner } from "@/types/editor";
import { getTemplatesForResolution } from "@/lib/mockTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutGrid, Blocks, Heart, Settings, Search, UploadCloud, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalConfigTab } from "./tabs/GlobalConfigTab";
import { BlocksTab } from "./tabs/BlocksTab";
import { UploadsTab } from "./tabs/UploadsTab";
import { PromptsTab } from "./tabs/PromptsTab";
import { BlockType, Block } from "@/types/editor";

export interface EditorSidebarProps {
    activeResolution: Resolution | null;
    onSelectTemplate?: (template: Template) => void;
    editorSettings: any; // Using any temporarily or should use EditorSettings if imported
    onSettingsChange: (settings: any) => void;
    onSaveSettings: () => void;
    isSavingSettings?: boolean;
    onAddBlock: (type: BlockType, payload?: any) => void;
    onUpdateBlock: (id: string, updates: Partial<Block>) => void;
    blocks: Block[];
    selectedBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
    onReorderBlocks: (fromIndex: number, toIndex: number) => void;
    onRemoveBlock: (id: string) => void;
}

export function EditorSidebar({
    activeResolution,
    onSelectTemplate,
    editorSettings,
    onSettingsChange,
    onSaveSettings,
    isSavingSettings,
    onAddBlock,
    onUpdateBlock,
    blocks,
    selectedBlockId,
    onSelectBlock,
    onReorderBlocks,
    onRemoveBlock
}: EditorSidebarProps) {
    const [search, setSearch] = useState("");

    const templates = useMemo(
        () => getTemplatesForResolution(activeResolution),
        [activeResolution]
    );

    const filteredTemplates = useMemo(() => {
        if (!search.trim()) return templates;
        const q = search.trim().toLowerCase();
        return templates.filter(
            (t) =>
                t.name.toLowerCase().includes(q) ||
                t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
                t.category.some((c) => c.toLowerCase().includes(q))
        );
    }, [templates, search]);

    const systemTemplates = filteredTemplates.filter((t) => t.owner === TemplateOwner.FeedReady);
    const communityTemplates = filteredTemplates.filter((t) => t.owner === TemplateOwner.Community);

    const formatBadge = activeResolution?.label?.slice(0, 2).toUpperCase() ?? "FR";

    return (
        <TooltipProvider delayDuration={300}>
            <aside className="w-[280px] h-full shrink-0 flex flex-col border-r border-border bg-card text-card-foreground overflow-hidden">
                <Tabs defaultValue="modelos" className="flex flex-col flex-1 min-h-0">
                    <TabsList className="w-full grid grid-cols-3 justify-start rounded-none border-b border-border bg-transparent p-0 h-auto gap-0 shrink-0">
                        <TabsTrigger
                            value="modelos"
                            className={cn(
                                "flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:shadow-none gap-1 px-1 h-10 text-[10px] font-bold tracking-tight"
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            MODELOS
                        </TabsTrigger>
                        <TabsTrigger
                            value="blocos"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:shadow-none gap-1 px-1 h-10 text-[10px] font-bold tracking-tight"
                        >
                            <Blocks className="h-3.5 w-3.5" />
                            BLOCOS
                        </TabsTrigger>
                        <TabsTrigger
                            value="kit"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:shadow-none gap-1 px-1 h-10 text-[10px] font-bold tracking-tight"
                        >
                            <Heart className="h-3.5 w-3.5" />
                            MARCA
                        </TabsTrigger>
                        <TabsTrigger
                            value="uploads"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:shadow-none gap-1 px-1 h-10 text-[10px] font-bold tracking-tight"
                        >
                            <UploadCloud className="h-3.5 w-3.5" />
                            MÍDIA
                        </TabsTrigger>
                        <TabsTrigger
                            value="geral"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:shadow-none gap-1 px-1 h-10 text-[10px] font-bold tracking-tight"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            GERAL
                        </TabsTrigger>
                        <TabsTrigger
                            value="prompts"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-500 data-[state=active]:shadow-none gap-1 px-1 h-10 text-[10px] font-bold tracking-tight"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                            PROMPTS
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="modelos" className="flex-1 data-[state=active]:flex flex-col min-h-0 mt-0 p-4">
                        <h2 className="font-semibold text-foreground">Modelos prontos</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Clique para usar uma cópia editável
                        </p>
                        <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar modelos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-muted/50 border-border"
                            />
                        </div>
                        <ScrollArea className="flex-1 mt-4 -mx-1 pr-2">
                            {systemTemplates.length > 0 && (
                                <section className="mb-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        DESTAQUE
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {systemTemplates.map((t) => (
                                            <TemplateCard
                                                key={t.id}
                                                template={t}
                                                formatBadge={formatBadge}
                                                onClick={() => onSelectTemplate?.(t)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {communityTemplates.length > 0 && (
                                <section>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Comunidade
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {communityTemplates.map((t) => (
                                            <TemplateCard
                                                key={t.id}
                                                template={t}
                                                formatBadge={formatBadge}
                                                onClick={() => onSelectTemplate?.(t)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {filteredTemplates.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4">
                                    {activeResolution
                                        ? "Nenhum modelo encontrado."
                                        : "Selecione um formato para ver os modelos."}
                                </p>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="blocos" className="flex-1 data-[state=active]:flex flex-col min-h-0 mt-0 p-4 overflow-y-auto">
                        <BlocksTab
                            onAddBlock={onAddBlock}
                            onUpdateBlock={onUpdateBlock}
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={(id) => onSelectBlock(id)}
                            onReorderBlocks={onReorderBlocks}
                            onRemoveBlock={onRemoveBlock}
                        />
                    </TabsContent>

                    <TabsContent value="kit" className="flex-1 min-h-0 mt-0 p-4">
                        <p className="text-sm text-muted-foreground">Kit de marca em breve.</p>
                    </TabsContent>

                    <TabsContent value="uploads" className="flex-1 data-[state=active]:flex flex-col min-h-0 mt-0 overflow-y-auto">
                        <UploadsTab onAddBlock={onAddBlock} />
                    </TabsContent>

                    <TabsContent value="prompts" className="flex-1 data-[state=active]:flex flex-col min-h-0 mt-0 overflow-y-auto">
                        <PromptsTab blocks={blocks} />
                    </TabsContent>

                    <TabsContent value="geral" className="flex-1 data-[state=active]:flex flex-col min-h-0 mt-0 p-4 overflow-y-auto">
                        <GlobalConfigTab
                            settings={editorSettings}
                            onChange={onSettingsChange}
                            onSave={onSaveSettings}
                            isSaving={isSavingSettings}
                        />
                    </TabsContent>
                </Tabs>
            </aside>
        </TooltipProvider>
    );
}

function TemplateCard({
    template,
    formatBadge,
    onClick,
}: {
    template: Template;
    formatBadge: string;
    onClick: () => void;
}) {
    const tooltipContent = (
        <div className="space-y-1.5 max-w-[220px]">
            {template.description && (
                <p className="text-muted-foreground text-xs leading-snug">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                    </span>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
                {template.width}×{template.height} · v{template.version}
            </p>
        </div>
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    className="group text-left rounded-lg overflow-hidden border border-border bg-background hover:border-emerald-500/50 hover:ring-1 hover:ring-emerald-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-card"
                >
                    <div className="relative aspect-[9/16] min-h-[80px] flex items-center justify-center" style={{ backgroundColor: template.background }}>
                        <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {formatBadge}
                        </span>
                        {/* Placeholder de preview: retângulos simulando blocos */}
                        <div className="w-3/4 space-y-1 opacity-40">
                            <div className="h-2 rounded bg-current opacity-60" style={{ width: "100%" }} />
                            <div className="h-2 rounded bg-current opacity-40" style={{ width: "70%" }} />
                            <div className="h-3 rounded bg-emerald-500/80" style={{ width: "50%" }} />
                        </div>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate px-2 py-1.5">
                        {template.name}
                    </p>
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-normal">
                {tooltipContent}
            </TooltipContent>
        </Tooltip>
    );
}
