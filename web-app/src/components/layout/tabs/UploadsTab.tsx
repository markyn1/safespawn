"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { ProtectedImage } from "@/components/ui/ProtectedImage";
import { Button } from "@/components/ui/button";
import { UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { BlockType } from "@/types/editor";

export interface UploadsTabProps {
    onAddBlock: (type: BlockType, payload?: any) => void;
}

export function UploadsTab({ onAddBlock }: UploadsTabProps) {
    const [uploads, setUploads] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const fetchUploads = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/uploads");
            setUploads(res.data || []);
        } catch (error) {
            console.error("Failed to load uploads:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUploads();
    }, [fetchUploads]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/uploads", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            if (res.data?.url) {
                setUploads(prev => [res.data.url, ...prev]);
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full min-h-0 bg-background text-foreground pb-4">
            <div className="sticky top-0 bg-background z-10 px-4 py-3 border-b border-border shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-sm">Meus Uploads</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Imagens enviadas por você</p>
                </div>

                <div className="relative">
                    <Button variant="secondary" size="sm" className="gap-2 shrink-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50" disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        {isUploading ? "Enviando..." : "Enviar"}
                    </Button>
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        <p className="text-xs">Carregando imagens...</p>
                    </div>
                ) : uploads.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                        <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-xs text-center max-w-[200px]">
                            Você ainda não enviou imagens.<br />
                            <span className="opacity-70">Faça upload da primeira!</span>
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {uploads.map((url, index) => (
                            <div
                                key={index}
                                className="aspect-square relative group bg-muted rounded-md overflow-hidden border border-border shadow-sm hover:ring-2 hover:ring-emerald-500 hover:ring-offset-1 transition-all cursor-pointer"
                                onClick={() => onAddBlock("image", { src: url })}
                            >
                                <ProtectedImage
                                    src={url}
                                    alt={`Upload ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-white text-xs font-semibold px-2 py-1 bg-black/50 rounded-md backdrop-blur-sm">Usar Imagem</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
