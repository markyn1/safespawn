import React, { useState } from "react";
import { Block, TextBlock, AITextBlock, CaptionIABlock, ImageBlock, AIImageBlock, VideoBlock, ShapeBlock, LogoBlock, MediaSlotBlock, EditorSettings } from "@/types/editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, Image as ImageIcon, X, Variable, Sparkles, CheckCircle2, Video, FileText, Clapperboard } from "lucide-react";
import { api } from "@/lib/api";
import { validateVariableName } from "@/lib/variables";
import { PromptSelectorModal } from "./PromptSelectorModal";
import { VariableAutocompleteInput } from "./VariableAutocompleteInput";

interface BlockPropertiesToolbarProps {
    block: Block;
    blocks: Block[];
    editorSettings: EditorSettings;
    onUpdateBlock: (id: string, updates: Partial<Block>) => void;
}

const FONT_FAMILIES = [
    { label: "Arial", value: "Arial" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Playfair Display", value: "Playfair Display" },
];

export function BlockPropertiesToolbar({ block, blocks, editorSettings, onUpdateBlock }: BlockPropertiesToolbarProps) {
    const isText = block.type === "text";
    const isAIText = block.type === "text_ia";
    const isImage = block.type === "image" || block.type === "image_ia" || block.type === "logo";
    const isVideo = block.type === "video";
    const isCaptionIA = block.type === "caption_ia";
    const isMediaSlot = block.type === "media_slot";
    const isShape = block.type === "shape";

    const [isUploading, setIsUploading] = useState(false);
    const [varNameError, setVarNameError] = useState<string | undefined>();
    const [promptModalOpen, setPromptModalOpen] = useState(false);

    // Handlers removidos para usar onChange inline para melhor simplificação do cast e evitar conflitos.

    // Image Handlers
    const handleImageSrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isImage) return;
        const b = block as ImageBlock | AIImageBlock | LogoBlock;
        onUpdateBlock(b.id, { payload: { ...b.payload, src: e.target.value } });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isImage) return;
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/uploads", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data?.url) {
                const b = block as ImageBlock | AIImageBlock | LogoBlock;
                onUpdateBlock(b.id, { payload: { ...b.payload, src: res.data.url } });
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const handleImageAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isImage) return;
        const b = block as ImageBlock | AIImageBlock; // logo usually doesn't need alt
        onUpdateBlock(b.id, { payload: { ...b.payload, alt: e.target.value } });
    };

    // Shape Handlers
    const handleShapeTypeChange = (value: string) => {
        if (!isShape) return;
        const b = block as ShapeBlock;
        onUpdateBlock(b.id, { payload: { ...b.payload, shapeType: value } });
    };

    return (
        <div className="flex items-center gap-4 text-sm animate-in fade-in zoom-in-95 duration-200">
            <span className="font-medium text-foreground mr-2 shrink-0 border-r pr-4 border-border/60">
                {block.title || "Bloco"}
            </span>

            {/* ── Regular Text Block ─────────────────────── */}
            {isText && (
                <>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="content" className="text-xs text-muted-foreground">Texto</Label>
                        <VariableAutocompleteInput
                            id="content"
                            blocks={blocks}
                            value={"content" in block.payload ? block.payload.content || "" : ""}
                            onValueChange={(val) => {
                                // Re-use the handler logic manually or directly invoke onUpdateBlock
                                onUpdateBlock(block.id, {
                                    payload: { ...block.payload, content: val }
                                });
                            }}
                            className="h-8 w-40 text-xs"
                            placeholder="Digite aqui..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fontFamily" className="text-xs text-muted-foreground">Fonte</Label>
                        <Select
                            value={"fontFamily" in block.payload && block.payload.fontFamily ? block.payload.fontFamily : editorSettings.fontFamily}
                            onValueChange={(value) => {
                                const b = block as TextBlock | AITextBlock;
                                onUpdateBlock(b.id, { payload: { ...b.payload, fontFamily: value } });
                            }}
                        >
                            <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_FAMILIES.map((f) => (
                                    <SelectItem key={f.value} value={f.value} className="text-xs">
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fontSize" className="text-xs text-muted-foreground">Tam.</Label>
                        <Input
                            id="fontSize"
                            type="number"
                            value={"fontSize" in block.payload && block.payload.fontSize ? block.payload.fontSize : editorSettings.fontSize}
                            onChange={(e) => {
                                const b = block as TextBlock | AITextBlock;
                                onUpdateBlock(b.id, { payload: { ...b.payload, fontSize: parseInt(e.target.value) || undefined } });
                            }}
                            className="h-8 w-16 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fontColor" className="text-xs text-muted-foreground">Cor</Label>
                        <Input
                            id="fontColor"
                            type="color"
                            value={"fontColor" in block.payload && block.payload.fontColor ? block.payload.fontColor : editorSettings.fontColor}
                            onChange={(e) => {
                                const b = block as TextBlock | AITextBlock;
                                onUpdateBlock(b.id, { payload: { ...b.payload, fontColor: e.target.value } });
                            }}
                            className="h-8 w-12 p-1 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fontWeight" className="text-xs text-muted-foreground">Peso</Label>
                        <Select
                            value={"fontWeight" in block.payload && block.payload.fontWeight ? block.payload.fontWeight : editorSettings.fontWeight}
                            onValueChange={(value) => {
                                const b = block as TextBlock | AITextBlock;
                                onUpdateBlock(b.id, { payload: { ...b.payload, fontWeight: value } });
                            }}
                        >
                            <SelectTrigger className="h-8 w-24 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="medium">Médio</SelectItem>
                                <SelectItem value="semibold">Semi-Bold</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            {/* ── AI Text Block ──────────────────────────── */}
            {isAIText && (() => {
                const aiBlock = block as AITextBlock;
                const hasPrompt = !!aiBlock.payload.prompt;
                return (
                    <>
                        <Button
                            size="sm"
                            variant={hasPrompt ? "outline" : "default"}
                            className={`h-8 gap-1.5 text-xs ${hasPrompt
                                ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                            onClick={() => setPromptModalOpen(true)}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {hasPrompt ? "Trocar Prompt" : "Selecionar Prompt"}
                        </Button>

                        {hasPrompt && (
                            <div className="flex items-center gap-1.5 max-w-[260px] px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {aiBlock.payload.prompt}
                                </p>
                            </div>
                        )}

                        {/* Typography (same as text) */}
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Fonte</Label>
                            <Select
                                value={aiBlock.payload.fontFamily || editorSettings.fontFamily}
                                onValueChange={(value) => {
                                    onUpdateBlock(aiBlock.id, { payload: { ...aiBlock.payload, fontFamily: value } });
                                }}
                            >
                                <SelectTrigger className="h-8 w-28 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_FAMILIES.map((f) => (
                                        <SelectItem key={f.value} value={f.value} className="text-xs">
                                            {f.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Tam.</Label>
                            <Input
                                type="number"
                                value={aiBlock.payload.fontSize || editorSettings.fontSize}
                                onChange={(e) => onUpdateBlock(aiBlock.id, { payload: { ...aiBlock.payload, fontSize: parseInt(e.target.value) || undefined } })}
                                className="h-8 w-16 text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="color"
                                value={aiBlock.payload.fontColor || editorSettings.fontColor}
                                onChange={(e) => onUpdateBlock(aiBlock.id, { payload: { ...aiBlock.payload, fontColor: e.target.value } })}
                                className="h-8 w-12 p-1 cursor-pointer"
                            />
                        </div>

                        <PromptSelectorModal
                            open={promptModalOpen}
                            onOpenChange={setPromptModalOpen}
                            blocks={blocks}
                            initialPayload={aiBlock.payload}
                            onApply={(data) => {
                                onUpdateBlock(aiBlock.id, {
                                    payload: { ...aiBlock.payload, ...data }
                                });
                            }}
                        />
                    </>
                );
            })()}

            {isImage && (
                <>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="src" className="text-xs text-muted-foreground">URL</Label>
                        {(() => {
                            const srcValue = "src" in block.payload ? block.payload.src || "" : "";
                            const isLocalImage = srcValue.includes("/uploads/") || srcValue.startsWith("blob:");
                            if (isLocalImage) {
                                return (
                                    <div className="h-8 w-64 flex items-center justify-between px-3 border border-border rounded-md bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium select-none">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">Imagem Local (Upload)</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const b = block as ImageBlock | AIImageBlock | LogoBlock;
                                                onUpdateBlock(b.id, { payload: { ...b.payload, src: "" } });
                                            }}
                                            className="hover:bg-emerald-500/20 p-1 rounded-sm shrink-0 transition-colors"
                                            title="Remover imagem local"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            }
                            return (
                                <Input
                                    id="src"
                                    value={srcValue}
                                    onChange={handleImageSrcChange}
                                    className="h-8 w-64 text-xs"
                                    placeholder="https://..."
                                />
                            );
                        })()}
                        <div className="relative inline-block w-8 h-8">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={isUploading}>
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            </Button>
                            <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                title="Enviar imagem local"
                            />
                        </div>
                    </div>
                    {block.type !== "logo" && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="alt" className="text-xs text-muted-foreground">Alt text</Label>
                            <Input
                                id="alt"
                                value={"alt" in block.payload ? block.payload.alt || "" : ""}
                                onChange={handleImageAltChange}
                                className="h-8 w-32 text-xs"
                                placeholder="..."
                            />
                        </div>
                    )}
                </>
            )}

            {/* ── Video Block ───────────────────────────────── */}
            {isVideo && (() => {
                const vBlock = block as VideoBlock;
                const srcValue = vBlock.payload.src || "";
                const isLocalVideo = srcValue.includes("/uploads/") || srcValue.startsWith("blob:");
                return (
                    <>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                            <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Vídeo Principal</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground shrink-0">URL / Src</Label>
                            {isLocalVideo ? (
                                <div className="h-8 w-52 flex items-center justify-between px-3 border border-border rounded-md bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400 font-medium select-none">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <Video className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">Vídeo local</span>
                                    </div>
                                    <button
                                        onClick={() => onUpdateBlock(vBlock.id, { payload: { ...vBlock.payload, src: "" } })}
                                        className="hover:bg-blue-500/20 p-1 rounded-sm shrink-0 transition-colors"
                                        title="Remover vídeo"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <Input
                                    value={srcValue}
                                    onChange={(e) => onUpdateBlock(vBlock.id, { payload: { ...vBlock.payload, src: e.target.value } })}
                                    className="h-8 w-52 text-xs"
                                    placeholder="https://... ou /api/uploads/..."
                                />
                            )}
                            {/* File upload button */}
                            <div className="relative inline-block w-8 h-8">
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={isUploading}>
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                </Button>
                                <input
                                    type="file"
                                    accept="video/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isUploading}
                                    title="Enviar vídeo local"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setIsUploading(true);
                                        try {
                                            const fd = new FormData();
                                            fd.append("file", file);
                                            const res = await api.post("/api/uploads", fd, {
                                                headers: { "Content-Type": "multipart/form-data" },
                                            });
                                            const url: string = res.data.url;
                                            onUpdateBlock(vBlock.id, { payload: { ...vBlock.payload, src: url } });
                                        } catch (err) {
                                            console.error("Erro no upload de vídeo:", err);
                                        } finally {
                                            setIsUploading(false);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Playback options */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={vBlock.payload.loop ?? true}
                                    onChange={(e) => onUpdateBlock(vBlock.id, { payload: { ...vBlock.payload, loop: e.target.checked } })}
                                    className="h-3 w-3 accent-blue-500"
                                />
                                Loop
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={vBlock.payload.muted ?? true}
                                    onChange={(e) => onUpdateBlock(vBlock.id, { payload: { ...vBlock.payload, muted: e.target.checked } })}
                                    className="h-3 w-3 accent-blue-500"
                                />
                                Mudo
                            </label>
                        </div>
                    </>
                );
            })()}

            {/* ── Caption IA Block ──────────────────────────── */}
            {isCaptionIA && (() => {
                const capBlock = block as CaptionIABlock;
                const hasPrompt = !!capBlock.payload.prompt;
                return (
                    <>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
                            <FileText className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Legenda da Postagem</span>
                            <span className="text-[9px] text-violet-400/60 bg-violet-500/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full">Invisível no canvas</span>
                        </div>

                        <Button
                            size="sm"
                            variant={hasPrompt ? "outline" : "default"}
                            className={`h-8 gap-1.5 text-xs ${hasPrompt
                                ? "border-violet-500/40 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10"
                                : "bg-violet-600 hover:bg-violet-700 text-white"
                                }`}
                            onClick={() => setPromptModalOpen(true)}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {hasPrompt ? "Trocar Prompt" : "Selecionar Prompt"}
                        </Button>

                        {hasPrompt && (
                            <div className="flex items-center gap-1.5 max-w-[260px] px-2 py-1 rounded-md bg-violet-500/5 border border-violet-500/20">
                                <CheckCircle2 className="h-3 w-3 text-violet-500 shrink-0" />
                                <p className="text-[10px] text-muted-foreground truncate">{capBlock.payload.prompt}</p>
                            </div>
                        )}

                        <PromptSelectorModal
                            open={promptModalOpen}
                            onOpenChange={setPromptModalOpen}
                            blocks={blocks}
                            initialPayload={capBlock.payload as any}
                            onApply={(data) => {
                                onUpdateBlock(capBlock.id, {
                                    payload: { ...capBlock.payload, ...data }
                                });
                            }}
                        />
                    </>
                );
            })()}

            {/* ── Media Slot ────────────────────────────────── */}
            {isMediaSlot && (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 flex-shrink-0 h-8 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <Clapperboard className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Conteúdo Principal</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                        Espaço reservado. Preenchido<br />no processamento.
                    </p>
                </div>
            )}

            {isShape && (
                <>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="shapeType" className="text-xs text-muted-foreground">Forma</Label>
                        <Select
                            value={"shapeType" in block.payload ? block.payload.shapeType || "rectangle" : "rectangle"}
                            onValueChange={handleShapeTypeChange}
                        >
                            <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rectangle">Retângulo</SelectItem>
                                <SelectItem value="circle">Círculo</SelectItem>
                                <SelectItem value="triangle">Triângulo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            {/* ── Variable Name ──────────────────────────────── */}
            <div className="flex flex-col gap-0.5 ml-2 pl-2 border-l border-border/60">
                <div className="flex items-center gap-1.5">
                    <Variable className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <Label htmlFor="varName" className="text-xs text-muted-foreground shrink-0">Variável</Label>
                    <Input
                        id="varName"
                        value={block.variableName || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            const result = validateVariableName(val, block.id, blocks);
                            setVarNameError(result.error);
                            onUpdateBlock(block.id, { variableName: val } as any);
                        }}
                        className={`h-8 w-28 text-xs font-mono ${varNameError ? "border-red-400 focus-visible:ring-red-400" : ""
                            }`}
                        placeholder="ex: titulo"
                        spellCheck={false}
                    />
                </div>
                {varNameError && (
                    <p className="text-[10px] text-red-500 leading-tight max-w-[220px]">{varNameError}</p>
                )}
            </div>
        </div>
    );
}
