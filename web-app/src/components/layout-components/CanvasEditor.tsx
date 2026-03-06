import React, { useRef, useMemo } from "react";
import { Rnd } from "react-rnd";
import { Type, Image as ImageIcon, Maximize2 } from "lucide-react";
import { BlockData } from "@/hooks/useLayout";

export type VariableScope = "perfil" | "global";

export interface AvailableVariable {
    name: string;
    scope: VariableScope;
    value?: string;
}

interface CanvasEditorProps {
    blocks: BlockData[];
    setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
    canvasW: number;
    canvasH: number;
    scale: number;
    activeElementId: string | null;
    setActiveElementId: (id: string | null) => void;
    editingTextId: string | null;
    setEditingTextId: (id: string | null) => void;
    bgImage: string | null;
    background_color: string;
    font_bold: string;
    /** Variáveis do perfil social (identidade) + globais, para inserir em blocos de texto estático */
    profileIdentity?: { display_name?: string; username?: string; contact?: string; genre?: string; custom_vars?: Record<string, string> };
    globalVars?: Record<string, string>;
}

function buildAvailableVariables(
    profileIdentity?: { display_name?: string; username?: string; contact?: string; genre?: string; custom_vars?: Record<string, string> },
    globalVars?: Record<string, string>
): AvailableVariable[] {
    const list: AvailableVariable[] = [];
    const perfilFields = ["display_name", "username", "contact", "genre"] as const;
    perfilFields.forEach((key) => list.push({ name: key, scope: "perfil", value: profileIdentity?.[key] || "" }));
    Object.entries(profileIdentity?.custom_vars || {}).forEach(([k, v]) => list.push({ name: k, scope: "perfil", value: v }));
    Object.entries(globalVars || {}).forEach(([k, v]) => list.push({ name: k, scope: "global", value: v }));
    return list;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
    blocks, setBlocks, canvasW, canvasH, scale,
    activeElementId, setActiveElementId,
    editingTextId, setEditingTextId,
    bgImage, background_color, font_bold,
    profileIdentity, globalVars
}) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const availableVariables = useMemo(() => buildAvailableVariables(profileIdentity, globalVars), [profileIdentity, globalVars]);

    const insertVariable = (varName: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const snippet = `!{${varName}}`;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = ta.value.slice(0, start);
        const after = ta.value.slice(end);
        const newValue = before + snippet + after;
        ta.value = newValue;
        ta.selectionStart = ta.selectionEnd = start + snippet.length;
        ta.focus();
        setBlocks((prev) => prev.map((b) => (editingTextId && b.id === editingTextId ? { ...b, value: newValue } : b)));
    };

    const editingStaticBlock = editingTextId && availableVariables.length > 0 && blocks.find((b) => b.id === editingTextId && b.subtype === "static");

    return (
        <div
            className="relative overflow-visible"
            style={{ width: `${canvasW * scale}px`, height: `${canvasH * scale}px` }}
        >
            <div
                className="relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden"
                style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: background_color,
                    backgroundImage: bgImage ? `url(${bgImage})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transition: "width 0.2s, height 0.2s",
                }}
            >
                <div
                    style={{
                        width: `${canvasW}px`,
                        height: `${canvasH}px`,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                    }}
                >
                {blocks.filter(b => b.visible).map((block) => (
                    <Rnd
                        key={block.id}
                        size={{ width: block.w, height: block.h }}
                        position={{ x: block.x, y: block.y }}
                        disableDragging={block.locked}
                        enableResizing={!block.locked}
                        lockAspectRatio={block.type === "image" || block.type === "media"}
                        onDragStop={(_e, d) => {
                            setBlocks(prev => prev.map(b => b.id === block.id ? {
                                ...b,
                                x: Math.round(Math.max(0, Math.min(d.x, canvasW - b.w))),
                                y: Math.round(Math.max(0, Math.min(d.y, canvasH - b.h)))
                            } : b));
                        }}
                        onResizeStop={(_e, _dir, ref, _delta, pos) => {
                            setBlocks(prev => prev.map(b => b.id === block.id ? {
                                ...b,
                                w: Math.round(parseInt(ref.style.width, 10)),
                                h: Math.round(parseInt(ref.style.height, 10)),
                                x: Math.round(Math.max(0, Math.min(pos.x, canvasW - parseInt(ref.style.width)))),
                                y: Math.round(Math.max(0, Math.min(pos.y, canvasH - parseInt(ref.style.height))))
                            } : b));
                        }}
                        onDragStart={() => setActiveElementId(block.id)}
                        onResizeStart={() => setActiveElementId(block.id)}
                        onClickCapture={() => setActiveElementId(block.id)}
                        scale={scale}
                        minWidth={20}
                        minHeight={20}
                        className={`group absolute cursor-move border-[1.5px] transition-colors overflow-hidden backdrop-blur-[2px] shadow-xl ${activeElementId === block.id ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 'border-neutral-500/20 hover:border-white/50'}`}
                        style={{
                            backgroundColor: block.type === 'text' ? (block.color || 'rgba(0,0,0,0.1)') : 'transparent',
                            zIndex: activeElementId === block.id ? 9999 : (block.zIndex ?? 10)
                        }}
                    >
                        <div className="w-full h-full relative" style={{ overflow: 'visible' }}>
                            {block.type === "text" ? (
                                <div className="w-full h-full flex flex-col justify-start relative px-1">
                                    <div className="absolute -top-4 left-0 right-0 h-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity px-1 pointer-events-none z-10">
                                        <span className="text-[9px] font-black uppercase text-white bg-emerald-600 px-1 rounded shadow-sm">{block.label}</span>
                                    </div>

                                    {editingTextId === block.id ? (
                                        <textarea
                                            ref={block.subtype === "static" ? textareaRef : undefined}
                                            autoFocus
                                            defaultValue={block.value || `Exemplo ${block.label}`}
                                            onBlur={e => {
                                                setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, value: e.target.value } : b));
                                                setEditingTextId(null);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === "Escape") setEditingTextId(null);
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            onMouseDown={e => e.stopPropagation()}
                                            className="w-full h-full resize-none bg-transparent border-none outline-none p-0 font-black leading-tight"
                                            style={{
                                                fontSize: `${block.fontSize || 36}px`,
                                                color: block.fontColor || "#fff",
                                                fontFamily: (block.fontFamily || font_bold)
                                                    ? `'${(block.fontFamily || font_bold).split("/").pop()?.replace(/\.[^.]+$/, "")}', sans-serif`
                                                    : "Helvetica, Arial, sans-serif",
                                                caretColor: "white",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] p-0 m-0 overflow-hidden leading-tight flex items-start"
                                            style={{
                                                fontSize: `${block.fontSize || 36}px`,
                                                color: block.fontColor || '#fff',
                                                fontFamily: (block.fontFamily || font_bold)
                                                    ? `'${(block.fontFamily || font_bold).split('/').pop()?.replace(/\.[^.]+$/, '')}', sans-serif`
                                                    : 'Helvetica, Arial, sans-serif'
                                            }}
                                            onDoubleClick={e => {
                                                e.stopPropagation();
                                                if (block.subtype === 'static') {
                                                    setActiveElementId(block.id);
                                                    setEditingTextId(block.id);
                                                }
                                            }}
                                        >
                                            {block.value || (block.subtype === 'dynamic' ? `[${block.label}]` : 'Exemplo TEXTO')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-0 m-0 overflow-hidden">
                                    {block.type === 'image' ? (
                                        <img
                                            src={block.src?.startsWith('http') || block.src?.startsWith('/')
                                                ? block.src
                                                : `http://localhost:8000/api/designs/${block.src}`
                                            }
                                            alt={block.label}
                                            className="w-full h-full object-contain"
                                            style={{ opacity: block.opacity ?? 1 }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-purple-500/20 flex flex-col items-center justify-center border-2 border-dashed border-purple-500/40">
                                            <Maximize2 className="w-12 h-12 text-purple-500/30" />
                                            <span className="text-purple-500/50 text-[50px] font-black uppercase opacity-20">{block.label}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Rnd>
                ))}
                </div>
            </div>
            {editingStaticBlock && (
                <div
                    className="absolute z-[10000] rounded-xl bg-card border border-border shadow-xl p-4 min-w-[300px] max-w-[340px]"
                    style={{
                        left: "100%",
                        marginLeft: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <p className="text-sm font-semibold text-foreground mb-2">
                        Variáveis: use <code className="text-emerald-600 font-mono">!&#123;nome&#125;</code> — clique para inserir
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableVariables.map((v) => (
                            <button
                                key={`${v.scope}-${v.name}`}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    insertVariable(v.name);
                                }}
                                className="text-sm font-mono px-3 py-1.5 rounded-md bg-muted hover:bg-emerald-600 hover:text-white text-foreground border border-border transition-colors"
                                title={v.value ? `Valor: ${v.value}` : "Clique para inserir no texto"}
                            >
                                {v.scope === "global" ? "🌐 " : ""}!&#123;{v.name}&#125;
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
