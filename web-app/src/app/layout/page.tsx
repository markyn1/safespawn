"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { Resolution } from "@/types/settings";
import type { EditorSettings, BrandKit, Block, BlockType } from "@/types/editor";
import type { Template } from "@/types/editor";
import { Navbar } from "@/components/Navbar";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Rnd } from "react-rnd";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Check, LayoutGrid, ZoomIn, ZoomOut, Maximize2, Image as ImageIcon, Sparkles, Video, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlockPropertiesToolbar } from "@/components/editor/BlockPropertiesToolbar";
import { buildVariableMap, resolveVariables } from "@/lib/variables";
import { DebugPanel } from "@/components/editor/DebugPanel";
import { ProtectedImage } from "@/components/ui/ProtectedImage";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const FIT_PADDING = 0.85;

const LAYOUT_RESOLUTION_STORAGE_KEY = "layout-active-resolution";
const EDITOR_SETTINGS_STORAGE_KEY = "editor-global-settings";

function loadStoredSettings(): EditorSettings | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as EditorSettings;
    } catch {
        return null;
    }
}

function saveSettingsToStorage(s: EditorSettings) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(s));
    } catch {
        // ignore
    }
}

function loadStoredResolution(): Resolution | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(LAYOUT_RESOLUTION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Resolution;
        return parsed?.id != null && parsed?.width != null && parsed?.height != null ? parsed : null;
    } catch {
        return null;
    }
}

function saveResolutionToStorage(r: Resolution) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(LAYOUT_RESOLUTION_STORAGE_KEY, JSON.stringify(r));
    } catch {
        // ignore
    }
}

function getDefaultEditorConfig(): EditorSettings {
    return {
        backgroundColor: "#000000",
        fontColor: "#FFFFFF",
        fontFamily: "Arial",
        fontSize: 16,
        fontWeight: "normal",
        textAlign: "left",
    };
}

/** Gera o título do editor definido pelo sistema (formato atual; em breve mais informações). */
function getEditorTitle(resolution: Resolution | null): string {
    if (!resolution) return "Nenhum formato";
    const name = resolution.label || resolution.name;
    const size = `${resolution.width}×${resolution.height}`;
    return `${name} · ${size}`;
}

export type SaveStatus = "saved" | "pending";

function getSaveStatusLabel(status: SaveStatus): string {
    return status === "saved" ? "Salvo" : "Alterações pendentes";
}

function getBrandsKit(): BrandKit {
    return {
        id: 0,
        name: "",
        description: "",
        logo: "",
        colors: [],
        fonts: [],
        variables: { nome: "", slogan: "", email: "", site: "" },
    };
}

export default function LayoutPage() {
    const [resolutions, setResolutions] = useState<Resolution[]>([]);
    const [activeResolution, setActiveResolution] = useState<Resolution | null>(null);
    const [formatOpen, setFormatOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 });
    const [isPanning, setIsPanning] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
    const [editorSettings, setEditorSettings] = useState<EditorSettings>(getDefaultEditorConfig());
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const panStart = useRef({ x: 0, y: 0 });
    const viewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchResolutions();
        const stored = loadStoredSettings();
        if (stored) setEditorSettings(stored);
    }, []);

    const fetchResolutions = async () => {
        const res = await api.get("/resolutions");
        setResolutions(res.data);
        const stored = loadStoredResolution();
        if (res.data?.length) {
            const match = stored
                ? res.data.find((r: Resolution) => r.id === stored.id)
                : null;
            const initial = match ?? res.data[0];
            setActiveResolution(initial);
            if (!match && stored) saveResolutionToStorage(initial);
        }
    };

    const handleChooseResolution = useCallback((r: Resolution) => {
        setActiveResolution(r);
        saveResolutionToStorage(r);
        setFormatOpen(false);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setSaveStatus("pending");
    }, []);

    // Trigger: quando uma resolução está selecionada, dispara efeitos do editor (por enquanto não faz nada).
    useEffect(() => {
        if (!activeResolution) return;
        // TODO: aqui podem ser registrados callbacks / eventos do editor (ferramentas, layers, etc.)
    }, [activeResolution]);

    // Medir viewport para calcular "fit" e redimensionar
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            setViewportSize({ w: el.clientWidth, h: el.clientHeight });
        });
        ro.observe(el);
        setViewportSize({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, [activeResolution]);

    // Configurações globais
    const handleSettingsChange = useCallback((newSettings: EditorSettings) => {
        setEditorSettings(newSettings);
    }, []);

    const handleSaveSettings = useCallback(async () => {
        setIsSavingSettings(true);
        // Simular delay de rede/persistência
        await new Promise(resolve => setTimeout(resolve, 600));
        saveSettingsToStorage(editorSettings);
        setIsSavingSettings(false);
    }, [editorSettings]);

    const handleUpdateBlock = useCallback((id: string, updates: Partial<Block>) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, ...updates } as Block : b))
        );
        setSaveStatus("pending");
    }, []);

    const handleReorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
        setBlocks((prev) => {
            const newBlocks = [...prev];
            const [moved] = newBlocks.splice(fromIndex, 1);
            // Inserir na nova posição
            newBlocks.splice(toIndex, 0, moved);

            // Recalcular z-index para que o index 0 (topo) tenha o maior z-index
            return newBlocks.map((b, i) => ({
                ...b,
                z_index: newBlocks.length - i
            }));
        });
        setSaveStatus("pending");
    }, []);

    const handleAddBlock = useCallback((type: BlockType, initialPayload?: any) => {
        const id = `block-${Date.now()}`;

        // Only one media_slot is allowed per template
        if (type === "media_slot" && blocks.some(b => b.type === "media_slot")) {
            return;
        }

        let defaultPayload = {};
        if (type === "text" || type === "text_ia") {
            defaultPayload = {
                content: "Novo texto",
            };
        }
        if (type === "video") {
            defaultPayload = { src: "", loop: true, muted: true };
        }

        const isMediaSlot = type === "media_slot";
        const isCaption = type === "caption_ia";
        const isText = type === "text" || type === "text_ia";

        // media_slot: half canvas so it doesn't overwhelm. Text/caption are slim. Others square-ish.
        const canvasW = activeResolution?.width ?? 400;
        const canvasH = activeResolution?.height ?? 400;
        const defaultWidth = isMediaSlot ? Math.round(canvasW * 0.7) : isText ? 300 : isCaption ? 400 : 200;
        const defaultHeight = isMediaSlot ? Math.round(canvasH * 0.7) : isText ? 50 : isCaption ? 80 : 200;

        const newBlock = {
            id,
            title: isMediaSlot ? "Conteúdo Principal" : isCaption ? "Legenda da Postagem" : `Novo ${type}`,
            type,
            variableName: isMediaSlot ? "video" : "",
            x: 0,
            y: 0,
            width: defaultWidth,
            height: defaultHeight,
            style: {
                backgroundColor: type === "shape" ? undefined : "transparent",
                textAlign: undefined,
            },
            payload: { ...defaultPayload, ...initialPayload },
            // Inicialmente recebe z_index alto; será recalculado
            z_index: 999,
            renderized: !isCaption
        } as Block;

        // Adiciona no topo da lista (index 0) e recalcula os z-index de todos
        setBlocks((prev) => {
            const newBlocks = [newBlock, ...prev];
            return newBlocks.map((b, i) => ({
                ...b,
                z_index: newBlocks.length - i
            }));
        });

        setSelectedBlockId(id);
        setSaveStatus("pending");
    }, [editorSettings]);

    const handleRemoveBlock = useCallback((id: string) => {
        setBlocks((prev) => prev.filter(b => b.id !== id));
        if (selectedBlockId === id) {
            setSelectedBlockId(null);
        }
        setSaveStatus("pending");
    }, [selectedBlockId]);

    const fitScale = activeResolution
        ? Math.min(
            (viewportSize.w * FIT_PADDING) / activeResolution.width,
            (viewportSize.h * FIT_PADDING) / activeResolution.height
        )
        : 1;

    const artboardWidth = activeResolution ? activeResolution.width * fitScale : 0;
    const artboardHeight = activeResolution ? activeResolution.height * fitScale : 0;

    const zoomIn = useCallback(() => {
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
    }, []);
    const zoomOut = useCallback(() => {
        setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    }, []);
    const fitToScreen = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleWheel = useCallback(
        (e: WheelEvent) => {
            if (!activeResolution) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
        },
        [activeResolution]
    );

    useEffect(() => {
        const el = viewportRef.current;
        if (!el || !activeResolution) return;
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [activeResolution, handleWheel]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }, [pan.x, pan.y]);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isPanning) return;
            setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
        },
        [isPanning]
    );
    const handleMouseUp = useCallback(() => setIsPanning(false), []);

    useEffect(() => {
        if (!isPanning) return;
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isPanning, handleMouseMove, handleMouseUp]);

    const handleSelectTemplate = useCallback((_template: Template) => {
        // TODO: aplicar template no canvas (carregar blocos, background, etc.)
    }, []);

    // Reactive variable map for resolving @{varname} tokens in canvas
    const variableMap = useMemo(() => buildVariableMap(blocks), [blocks]);

    // Keyboard navigation for selected block
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedBlockId) return;

            // Ignore if focus is in an input, textarea, or contentEditable
            const activeEl = document.activeElement;
            if (activeEl) {
                const tag = activeEl.tagName.toLowerCase();
                const isContentEditable = (activeEl as HTMLElement).isContentEditable;
                if (tag === "input" || tag === "textarea" || isContentEditable) {
                    return;
                }
            }

            const targetBlock = blocks.find((b) => b.id === selectedBlockId);
            if (!targetBlock || targetBlock.renderized === false || targetBlock.locked) return;

            const step = e.shiftKey ? 10 : 1;
            let dx = 0;
            let dy = 0;

            if (e.key === "ArrowUp") dy = -step;
            else if (e.key === "ArrowDown") dy = step;
            else if (e.key === "ArrowLeft") dx = -step;
            else if (e.key === "ArrowRight") dx = step;

            if (dx !== 0 || dy !== 0) {
                e.preventDefault(); // Prevent scrolling the page
                handleUpdateBlock(selectedBlockId, {
                    x: targetBlock.x + dx,
                    y: targetBlock.y + dy,
                });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedBlockId, blocks, handleUpdateBlock]);

    return (
        <>
            <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-sans text-foreground">
                <Navbar />
                <div className="flex flex-1 min-h-0 pt-16 h-screen">
                    <EditorSidebar
                        activeResolution={activeResolution}
                        onSelectTemplate={handleSelectTemplate}
                        editorSettings={editorSettings}
                        onSettingsChange={handleSettingsChange}
                        onSaveSettings={handleSaveSettings}
                        isSavingSettings={isSavingSettings}
                        onAddBlock={handleAddBlock}
                        onUpdateBlock={handleUpdateBlock}
                        blocks={blocks}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={setSelectedBlockId}
                        onReorderBlocks={handleReorderBlocks}
                        onRemoveBlock={handleRemoveBlock}
                    />
                    <div className="flex flex-col flex-1 min-h-0 min-w-0">
                        <header className="flex-none h-16 px-6 border-b border-border bg-background flex items-center justify-between gap-4 z-20 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg font-semibold text-foreground truncate" title={getEditorTitle(activeResolution)}>
                                    {getEditorTitle(activeResolution)}
                                </span>
                                <span
                                    className={cn(
                                        "shrink-0 text-xs font-medium px-2 py-0.5 rounded-md",
                                        saveStatus === "saved"
                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    )}
                                >
                                    {getSaveStatusLabel(saveStatus)}
                                </span>
                            </div>
                            <Dialog open={formatOpen} onOpenChange={setFormatOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <LayoutGrid className="h-4 w-4" />
                                        Escolher Formato
                                        {activeResolution && (
                                            <span className="text-muted-foreground font-normal">
                                                · {activeResolution.label || activeResolution.name} ({activeResolution.width}×{activeResolution.height})
                                            </span>
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm p-4 gap-3">
                                    <DialogHeader>
                                        <DialogTitle className="text-base">Escolher resolução</DialogTitle>
                                    </DialogHeader>
                                    <ul className="grid gap-1 max-h-[280px] overflow-y-auto pr-1">
                                        {resolutions.map((r) => (
                                            <li key={r.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleChooseResolution(r)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors hover:bg-accent",
                                                        activeResolution?.id === r.id && "bg-accent font-medium"
                                                    )}
                                                >
                                                    <span>{r.label || r.name}</span>
                                                    <span className="text-muted-foreground tabular-nums">
                                                        {r.width}×{r.height}
                                                    </span>
                                                    {activeResolution?.id === r.id && (
                                                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </DialogContent>
                            </Dialog>
                        </header>

                        <main className="flex-1 flex flex-col min-h-0">
                            {activeResolution ? (
                                <>
                                    <div className="flex-none flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-background min-h-[48px]">
                                        <div className="flex flex-1 items-center overflow-x-auto overflow-y-hidden no-scrollbar">
                                            {selectedBlockId && (
                                                <BlockPropertiesToolbar
                                                    block={blocks.find(b => b.id === selectedBlockId)!}
                                                    blocks={blocks}
                                                    editorSettings={editorSettings}
                                                    onUpdateBlock={handleUpdateBlock}
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} onMouseDown={(e) => e.stopPropagation()} title="Diminuir zoom">
                                                <ZoomOut className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} onMouseDown={(e) => e.stopPropagation()} title="Aumentar zoom">
                                                <ZoomIn className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" onClick={fitToScreen} onMouseDown={(e) => e.stopPropagation()} title="Encaixar na tela">
                                                <Maximize2 className="h-4 w-4" />
                                                Encaixar
                                            </Button>
                                            <span className="text-sm text-muted-foreground tabular-nums ml-2 hidden sm:inline-block">
                                                {Math.round(zoom * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        ref={viewportRef}
                                        className="flex-1 overflow-hidden bg-muted/20 relative cursor-grab active:cursor-grabbing"
                                        onMouseDown={handleMouseDown}
                                        style={{ touchAction: "none" }}
                                    >
                                        <div
                                            className="absolute rounded-sm shadow-xl overflow-hidden border border-border bg-white"
                                            style={{
                                                left: "50%",
                                                top: "50%",
                                                width: artboardWidth,
                                                height: artboardHeight,
                                                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                                transformOrigin: "center center",
                                            }}
                                        >
                                            {/* Quadro em branco: área de trabalho para blocos de texto e imagens */}
                                            <div
                                                className="w-full h-full relative transition-all overflow-hidden"
                                                style={{ backgroundColor: editorSettings.backgroundColor }}
                                                data-resolution-width={activeResolution.width}
                                                data-resolution-height={activeResolution.height}
                                                onClick={() => setSelectedBlockId(null)}
                                            >
                                                {blocks.filter(b => b.renderized !== false).map((block) => {
                                                    const isSelected = selectedBlockId === block.id;

                                                    return (
                                                        <Rnd
                                                            key={block.id}
                                                            size={{ width: block.width, height: block.height }}
                                                            position={{ x: block.x, y: block.y }}
                                                            onDragStop={(e, d) => {
                                                                handleUpdateBlock(block.id, { x: d.x, y: d.y });
                                                            }}
                                                            onResizeStop={(e, direction, ref, delta, position) => {
                                                                handleUpdateBlock(block.id, {
                                                                    width: parseInt(ref.style.width),
                                                                    height: parseInt(ref.style.height),
                                                                    ...position,
                                                                });
                                                            }}
                                                            scale={zoom}
                                                            bounds="parent"
                                                            enableResizing={!block.locked}
                                                            disableDragging={block.locked}
                                                            onMouseDown={(e: React.MouseEvent | MouseEvent) => {
                                                                e.stopPropagation();
                                                                setSelectedBlockId(block.id);
                                                            }}
                                                            onClick={(e: React.MouseEvent) => {
                                                                // Prevent bubbling so the canvas onClick doesn't deselect the block
                                                                e.stopPropagation();
                                                            }}
                                                            style={{
                                                                zIndex: isSelected ? 1000 : block.z_index,
                                                            }}
                                                            className={cn(
                                                                "group transition-none",
                                                                isSelected ? "ring-2 ring-emerald-500 ring-offset-0" : "hover:ring-1 hover:ring-emerald-500/50"
                                                            )}
                                                        >
                                                            <div
                                                                className={cn("w-full h-full flex items-center justify-center overflow-hidden", block.type !== "text" && "pointer-events-none")}
                                                                style={{
                                                                    backgroundColor: block.style?.backgroundColor || (block.type === "shape" ? editorSettings.backgroundColor : undefined),
                                                                    // The background color still applies from global/style config
                                                                    transform: `rotate(${block.rotation || 0}deg)`,
                                                                }}
                                                            >
                                                                {block.type === "text" ? (
                                                                    <div
                                                                        contentEditable
                                                                        suppressContentEditableWarning
                                                                        className="w-full px-2 break-words outline-none"
                                                                        spellCheck={false}
                                                                        onPointerDown={(e) => {
                                                                            // Prevent react-rnd from initiating drag when clicking the text
                                                                            e.stopPropagation();
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            const newText = e.target.innerText;
                                                                            handleUpdateBlock(block.id, {
                                                                                payload: { ...block.payload, content: newText }
                                                                            });
                                                                        }}
                                                                        style={{
                                                                            color: ("fontColor" in block.payload && block.payload.fontColor) ? block.payload.fontColor : (block.style?.fontColor || editorSettings.fontColor),
                                                                            fontFamily: ("fontFamily" in block.payload && block.payload.fontFamily) ? block.payload.fontFamily : (block.style?.fontFamily || editorSettings.fontFamily),
                                                                            fontSize: ("fontSize" in block.payload && block.payload.fontSize) ? block.payload.fontSize : (block.style?.fontSize || editorSettings.fontSize),
                                                                            fontWeight: ("fontWeight" in block.payload && block.payload.fontWeight) ? block.payload.fontWeight : (block.style?.fontWeight || editorSettings.fontWeight),
                                                                            textAlign: (block.style?.textAlign || editorSettings.textAlign) as any,
                                                                            cursor: "text",
                                                                            minHeight: "1em"
                                                                        }}
                                                                    >
                                                                        {"content" in block.payload
                                                                            ? resolveVariables(block.payload.content ?? "", variableMap)
                                                                            : block.title
                                                                        }
                                                                    </div>
                                                                ) : block.type === "text_ia" ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 py-2 relative">
                                                                        {/* IA Badge */}
                                                                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                                                            <Sparkles className="h-2.5 w-2.5 text-emerald-500" />
                                                                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">IA</span>
                                                                        </div>

                                                                        {"content" in block.payload && block.payload.content ? (
                                                                            /* Has AI-generated content → show it */
                                                                            <p
                                                                                className="w-full break-words text-center"
                                                                                style={{
                                                                                    color: ("fontColor" in block.payload && block.payload.fontColor) ? block.payload.fontColor : (block.style?.fontColor || editorSettings.fontColor),
                                                                                    fontFamily: ("fontFamily" in block.payload && block.payload.fontFamily) ? block.payload.fontFamily : (block.style?.fontFamily || editorSettings.fontFamily),
                                                                                    fontSize: ("fontSize" in block.payload && block.payload.fontSize) ? block.payload.fontSize : (block.style?.fontSize || editorSettings.fontSize),
                                                                                    fontWeight: ("fontWeight" in block.payload && block.payload.fontWeight) ? block.payload.fontWeight : (block.style?.fontWeight || editorSettings.fontWeight),
                                                                                    textAlign: (block.style?.textAlign || editorSettings.textAlign) as any,
                                                                                }}
                                                                            >
                                                                                {"content" in block.payload ? block.payload.content : ""}
                                                                            </p>
                                                                        ) : "prompt" in block.payload && block.payload.prompt ? (
                                                                            /* Has prompt but no content → show prompt preview */
                                                                            <>
                                                                                <Sparkles className="h-5 w-5 text-emerald-400 opacity-60" />
                                                                                <p className="text-[10px] text-muted-foreground text-center line-clamp-3 italic leading-snug">
                                                                                    {block.payload.prompt}
                                                                                </p>
                                                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Prompt configurado · aguardando geração</p>
                                                                            </>
                                                                        ) : (
                                                                            /* No prompt configured yet */
                                                                            <>
                                                                                <Sparkles className="h-6 w-6 text-muted-foreground opacity-30" />
                                                                                <p className="text-[10px] text-muted-foreground text-center opacity-70">Selecione um prompt<br />no painel de propriedades</p>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ) : block.type === "media_slot" ? (
                                                                    // ── MEDIA SLOT — amber placeholder, no content ──
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-400/50 bg-amber-500/[0.06] rounded">
                                                                        <Clapperboard className="h-10 w-10 text-amber-400 opacity-60" />
                                                                        <div className="text-center">
                                                                            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Conteúdo Principal</p>
                                                                            <p className="text-[9px] text-amber-500/70 mt-0.5">Vídeo ou imagem do usuário</p>
                                                                            <p className="text-[8px] text-amber-400/50 mt-1 font-mono">preenchido no processamento</p>
                                                                        </div>
                                                                    </div>
                                                                ) : block.type === "video" ? (
                                                                    // ── VIDEO BLOCK (normal) ──
                                                                    "src" in block.payload && block.payload.src ? (
                                                                        <video
                                                                            src={block.payload.src as string}
                                                                            className="w-full h-full"
                                                                            style={{ objectFit: (block.payload as any).objectFit ?? "cover" }}
                                                                            loop={(block.payload as any).loop ?? true}
                                                                            muted={(block.payload as any).muted ?? true}
                                                                            autoPlay
                                                                            playsInline
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                                            <Video className="h-8 w-8 text-muted-foreground opacity-30" />
                                                                            <p className="text-[10px] text-muted-foreground opacity-60 text-center">Nenhum vídeo</p>
                                                                        </div>
                                                                    )
                                                                ) : block.type === "caption_ia" ? (
                                                                    // ── CAPTION IA — invisible on export, shown as placeholder in editor ──
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 border border-dashed border-violet-400/30 bg-violet-500/[0.03] rounded px-3">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Sparkles className="h-4 w-4 text-violet-500 opacity-70" />
                                                                            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wide">Legenda IA</span>
                                                                        </div>
                                                                        <p className="text-[9px] text-muted-foreground text-center italic opacity-70 leading-snug">
                                                                            {"content" in block.payload && block.payload.content
                                                                                ? (block.payload.content as string)
                                                                                : "Gerada automaticamente · não aparece na imagem"
                                                                            }
                                                                        </p>
                                                                        <span className="text-[8px] text-violet-400/60 border border-violet-400/20 px-1.5 py-0.5 rounded-full">Invisível no export</span>
                                                                    </div>
                                                                ) : block.type === "image" || block.type === "image_ia" || block.type === "logo" ? (
                                                                    "src" in block.payload && block.payload.src ? (
                                                                        <ProtectedImage
                                                                            src={block.payload.src}
                                                                            alt={"alt" in block.payload ? block.payload.alt : block.title}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <ImageIcon className="text-muted-foreground opacity-20" size={48} />
                                                                    )
                                                                ) : (
                                                                    // Shape blocks fallback
                                                                    <div className="w-full h-full bg-muted opacity-20" />
                                                                )}
                                                            </div>

                                                            {/* Handles de redimensionamento visuais apenas quando selecionado */}
                                                            {isSelected && !block.locked && (
                                                                <>
                                                                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-50" />
                                                                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-50" />
                                                                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-50" />
                                                                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-50" />
                                                                </>
                                                            )}
                                                        </Rnd>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-8">
                                    <p className="text-muted-foreground">Selecione um formato para ver a área de edição.</p>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            {
                process.env.NODE_ENV === "development" && (
                    <DebugPanel project={{
                        blocks,
                        activeResolution,
                        editorSettings
                    }} />
                )
            }
        </>
    );
}
