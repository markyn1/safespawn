"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Resolution } from "@/types/settings";
import type { EditorSettings, BrandKit } from "@/types/editor";
import type { Template } from "@/types/editor";
import { Navbar } from "@/components/Navbar";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Check, LayoutGrid, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const FIT_PADDING = 0.85;

const LAYOUT_RESOLUTION_STORAGE_KEY = "layout-active-resolution";

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
    const panStart = useRef({ x: 0, y: 0 });
    const viewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchResolutions();
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

    return (
        <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-sans text-foreground">
            <Navbar />
            <div className="flex flex-1 min-h-0 mt-16">
                <EditorSidebar
                    activeResolution={activeResolution}
                    onSelectTemplate={handleSelectTemplate}
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
                        <div className="flex-none flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} onMouseDown={(e) => e.stopPropagation()} title="Diminuir zoom">
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} onMouseDown={(e) => e.stopPropagation()} title="Aumentar zoom">
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={fitToScreen} onMouseDown={(e) => e.stopPropagation()} title="Encaixar na tela">
                                <Maximize2 className="h-4 w-4" />
                                Encaixar
                            </Button>
                            <span className="text-sm text-muted-foreground tabular-nums ml-2">
                                {Math.round(zoom * 100)}%
                            </span>
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
                                {/* Quadro em branco: área de trabalho para blocos de texto e imagens (futuro) */}
                                <div
                                    className="w-full h-full relative bg-white"
                                    data-resolution-width={activeResolution.width}
                                    data-resolution-height={activeResolution.height}
                                >
                                    {/* Blocos (texto, imagens) serão position: absolute com coordenadas relativas ao artboard */}
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
    );
}
