import React from "react";
import {
    Layers, Type, Image as ImageIcon, Maximize2,
    ChevronUp, ChevronDown, Eye, EyeOff, Lock, Unlock, Trash2,
    Brain, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlockData } from "@/hooks/useLayout";

interface LayoutTabProps {
    blocks: BlockData[];
    setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
    activeElementId: string | null;
    setActiveElementId: (id: string | null) => void;
    availableFonts: any[];
    promptTemplates: any[];
    simulateAI: () => void;
    isSimulatingIA: boolean;
}

export const LayoutTab: React.FC<LayoutTabProps> = ({
    blocks, setBlocks, activeElementId, setActiveElementId,
    availableFonts, promptTemplates, simulateAI, isSimulatingIA
}) => {

    const toggleBlockVisibility = (id: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
    };

    const toggleBlockLock = (id: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, locked: !b.locked } : b));
    };

    const moveBlockZ = (id: string, direction: 'up' | 'down') => {
        setBlocks(prev => {
            const index = prev.findIndex(b => b.id === id);
            if (index === -1) return prev;
            if (direction === 'up' && index === prev.length - 1) return prev;
            if (direction === 'down' && index === 0) return prev;

            const newBlocks = [...prev];
            const targetIndex = direction === 'up' ? index + 1 : index - 1;
            const tempZ = newBlocks[index].zIndex;
            newBlocks[index].zIndex = newBlocks[targetIndex].zIndex || 10;
            newBlocks[targetIndex].zIndex = tempZ;
            [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
            return newBlocks;
        });
    };

    const removeBlock = (id: string) => {
        if (['title_area', 'subtitle_area', 'hook_area', 'media_area'].includes(id)) return;
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (activeElementId === id) setActiveElementId(null);
    };

    return (
        <div className="p-4 space-y-6">
            <section className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Camadas do Layout
                    </h3>
                    <Button
                        onClick={simulateAI}
                        disabled={isSimulatingIA}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                    >
                        {isSimulatingIA ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Brain className="w-3 h-3 mr-1" />}
                        {isSimulatingIA ? "SIMULANDO..." : "SIMULAR IA"}
                    </Button>
                </div>

                <div className="space-y-2">
                    {[...blocks].reverse().map((block) => (
                        <Card
                            key={block.id}
                            data-element-id={block.id}
                            onClick={() => setActiveElementId(block.id)}
                            className={`border-border/50 transition-all cursor-pointer overflow-hidden ${activeElementId === block.id ? 'ring-1 ring-emerald-500 bg-emerald-500/5' : 'hover:bg-muted/30 shadow-none'}`}
                        >
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between p-2 gap-2">
                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                        <div className="flex flex-col gap-0.5">
                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); moveBlockZ(block.id, 'up'); }}><ChevronUp className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); moveBlockZ(block.id, 'down'); }}><ChevronDown className="w-3 h-3" /></Button>
                                        </div>
                                        <div className="p-1.5 bg-muted/50 rounded shrink-0">
                                            {block.type === 'text' ? <Type className="w-3.5 h-3.5 text-emerald-500" /> : block.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> : <Maximize2 className="w-3.5 h-3.5 text-purple-500" />}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[11px] font-black uppercase tracking-tight truncate">{block.label}</span>
                                            <span className="text-[8px] text-muted-foreground uppercase opacity-70">Z: {block.zIndex} • {block.subtype === 'dynamic' ? 'IA' : 'Estático'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost" size="icon"
                                            className={`h-7 w-7 ${!block.visible ? 'text-muted-foreground' : 'text-emerald-500'}`}
                                            onClick={(e) => { e.stopPropagation(); toggleBlockVisibility(block.id); }}
                                        >
                                            {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className={`h-7 w-7 ${block.locked ? 'text-amber-500' : 'text-muted-foreground'}`}
                                            onClick={(e) => { e.stopPropagation(); toggleBlockLock(block.id); }}
                                        >
                                            {block.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                        </Button>
                                        {!['title_area', 'subtitle_area', 'hook_area', 'media_area'].includes(block.id) && (
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {activeElementId === block.id && (
                                    <div className="p-3 border-t border-border/30 bg-muted/5 space-y-3" onClick={e => e.stopPropagation()}>
                                        <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono">
                                            <div className="bg-muted/50 p-1.5 rounded text-center border border-border/20">X: {Math.round(block.x)}</div>
                                            <div className="bg-muted/50 p-1.5 rounded text-center border border-border/20">Y: {Math.round(block.y)}</div>
                                            <div className="bg-muted/50 p-1.5 rounded text-center border border-border/20">W: {Math.round(block.w)}</div>
                                            <div className="bg-muted/50 p-1.5 rounded text-center border border-border/20">H: {Math.round(block.h)}</div>
                                        </div>

                                        {block.type === 'text' && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col gap-1 w-20 shrink-0">
                                                        <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">Tamanho</span>
                                                        <Input
                                                            type="number"
                                                            value={block.fontSize}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 12;
                                                                setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, fontSize: val } : b));
                                                            }}
                                                            className="h-7 text-[11px] font-mono px-2 border-border/30"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1 flex-1">
                                                        <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">Cor</span>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={block.fontColor || '#FFFFFF'}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, fontColor: val } : b));
                                                                }}
                                                                className="w-7 h-7 cursor-pointer p-0 rounded border border-border/50"
                                                            />
                                                            <span className="text-[9px] font-mono uppercase text-muted-foreground">{block.fontColor || '#FFFFFF'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">Fonte</span>
                                                    <Select
                                                        value={block.fontFamily || '__default__'}
                                                        onValueChange={val => {
                                                            const f = val === '__default__' ? '' : val;
                                                            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, fontFamily: f } : b));
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full h-8 bg-background border-border/50 text-[11px] font-bold">
                                                            <SelectValue placeholder="Padrão do Perfil" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__default__" className="text-xs text-muted-foreground">Padrão do Perfil</SelectItem>
                                                            {availableFonts.map(f => (
                                                                <SelectItem key={f.id} value={f.id} className="text-xs font-medium">{f.name.replace(/\.[^.]+$/, '')}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {block.subtype === 'dynamic' && (
                                                    <div className="space-y-3 pt-3 mt-1 border-t border-border/30">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gerar com IA</span>
                                                            <Switch
                                                                checked={block.aiEnabled !== false}
                                                                onCheckedChange={(checked) => {
                                                                    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, aiEnabled: checked } : b));
                                                                }}
                                                            />
                                                        </div>

                                                        {block.aiEnabled !== false && (
                                                            <div className="space-y-2">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Prompt da Biblioteca</span>
                                                                <Select
                                                                    value={block.promptTemplateId ? String(block.promptTemplateId) : '__none__'}
                                                                    onValueChange={val => {
                                                                        const tid = val === '__none__' ? null : parseInt(val);
                                                                        setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, promptTemplateId: tid } : b));
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="w-full h-8 text-xs bg-background border-border/50">
                                                                        <SelectValue placeholder="Selecionar..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__" className="text-xs text-muted-foreground">Nenhum (Padrao)</SelectItem>
                                                                        {promptTemplates.map(tmpl => (
                                                                            <SelectItem key={tmpl.id} value={String(tmpl.id)} className="text-xs">
                                                                                <span className="font-bold">{tmpl.name}</span>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {block.type === 'media' && (
                                            <div className="space-y-2 pt-2 border-t border-border/30">
                                                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Enquadramento</span>
                                                <Select
                                                    value={block.scale_mode || 'fill'}
                                                    onValueChange={val => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, scale_mode: val as any } : b))}
                                                >
                                                    <SelectTrigger className="w-full h-8 text-xs font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="fill">Preencher (Fill)</SelectItem>
                                                        <SelectItem value="fit">Ajustar (Fit)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
};
