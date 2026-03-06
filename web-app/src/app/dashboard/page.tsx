"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import { Video, Link as LinkIcon, UploadCloud, RefreshCw, CheckCircle, AlertCircle, Star, Trash2, Clock, Coins, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Generation = {
    id: number;
    status: "pending" | "processing" | "completed" | "error";
    input_type: string;
    input_value: string;
    result_media_path: string | null;
    result_caption_path: string | null;
    error_message: string | null;
    is_favorite: boolean;
    tokens_used: number;
    created_at: string;
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case "completed":
            return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"><CheckCircle className="w-3 h-3 mr-1" /> Finalizado</Badge>;
        case "processing":
            return <Badge variant="outline" className="text-amber-400 border-amber-400/50"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Processando...</Badge>;
        case "error":
            return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
        default:
            return <Badge variant="secondary" className="text-muted-foreground"><RefreshCw className="w-3 h-3 mr-1" /> Na Fila</Badge>;
    }
};

const CaptionViewer = ({ captionPath }: { captionPath: string }) => {
    const [text, setText] = useState<string>("Carregando legenda...");

    useEffect(() => {
        const fetchCaption = async () => {
            try {
                const filename = captionPath.split('\\').pop()?.split('/').pop();
                const res = await fetch(`http://localhost:8000/api/output/${filename}`);
                if (!res.ok) throw new Error("Erro ao carregar");
                const data = await res.text();
                setText(data);
            } catch (err) {
                setText("Arquivo de legenda indisponível ou excluído.");
            }
        };
        fetchCaption();
    }, [captionPath]);

    return (
        <div className="mt-4 w-full p-4 bg-muted/50 border border-border rounded-lg text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {text}
        </div>
    );
};

export default function Dashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"url" | "upload">("url");
    const [urls, setUrls] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [generations, setGenerations] = useState<Generation[]>([]);

    const [showTokenModal, setShowTokenModal] = useState(false);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const [selectedProfile, setSelectedProfile] = useState("default");
    const [availableProfiles, setAvailableProfiles] = useState<string[]>(["default"]);
    const [selectedFormat, setSelectedFormat] = useState("instagram43");

    const [selectedSocialProfile, setSelectedSocialProfile] = useState("default");
    const [availableSocialProfiles, setAvailableSocialProfiles] = useState<any[]>([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/auth/login");
            return;
        }
        fetchHistory();
        fetchProfiles(selectedFormat);
        fetchSocialProfiles();
        const interval = setInterval(fetchHistory, 5000); // Poll status
        return () => clearInterval(interval);
    }, [router]);

    const fetchProfiles = async (fmt: string) => {
        try {
            const res = await api.get(`/settings/formats/${fmt}/profiles`);
            setAvailableProfiles(res.data.profiles || ["default"]);
        } catch {
            setAvailableProfiles(["default"]);
        }
    };

    const fetchSocialProfiles = async () => {
        try {
            const res = await api.get("/social-profiles");
            setAvailableSocialProfiles(res.data || []);
        } catch {
            setAvailableSocialProfiles([]);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get("/generate/history");
            setGenerations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleFavorite = async (id: number) => {
        try {
            await api.put(`/generate/history/${id}/favorite`);
            fetchHistory();
        } catch (err) {
            console.error("Erro ao favoritar", err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja apagar essa geração? Essa ação não pode ser desfeita.")) return;
        try {
            await api.delete(`/generate/history/${id}`);
            fetchHistory();
        } catch (err) {
            console.error("Erro ao apagar", err);
        }
    };

    const handleRetry = async (id: number) => {
        try {
            await api.post(`/generate/history/${id}/retry`);
            alert("A tarefa foi reiniciada. Aguarde o processamento terminar.");
            fetchHistory();
        } catch (err) {
            console.error(err);
            alert("Erro ao tentar refazer a tarefa.");
        }
    }

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDownload = async () => {
        if (selectedIds.length === 0) return;
        setIsExporting(true);
        try {
            const res = await api.post("/generate/history/export/zip", {
                generation_ids: selectedIds
            });
            window.open(res.data.download_url, "_blank");
            setSelectedIds([]); // limpa a seleção apos sucesso
        } catch (err) {
            alert("Erro ao exportar arquivos");
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleGenerateUrl = async (e: React.FormEvent) => {
        e.preventDefault();
        const urlList = urls.split("\n").map(u => u.trim()).filter(u => u.length > 0);
        if (urlList.length === 0) return;

        setLoading(true);
        try {
            await Promise.allSettled(
                urlList.map(url => api.post(`/generate/url?format_override=${selectedFormat}&profile_name=${encodeURIComponent(selectedProfile)}&social_profile_name=${encodeURIComponent(selectedSocialProfile)}`, { url }))
            );
            setUrls("");
            fetchHistory();
        } catch (err: any) {
            if (err.response?.status === 403) {
                setShowTokenModal(true);
            } else {
                alert("Erro ao enviar URLs");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("format_override", selectedFormat);
        formData.append("profile_name", selectedProfile);
        formData.append("social_profile_name", selectedSocialProfile);

        try {
            await api.post("/generate/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setFile(null);
            fetchHistory();
        } catch (err: any) {
            if (err.response?.status === 403) {
                setShowTokenModal(true);
            } else {
                alert("Erro ao fazer upload");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pt-20 pb-12 px-4 md:px-8 relative">
            <Toaster position="top-right" />
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Token Limit Modal */}
                <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
                    <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl">
                        <DialogHeader>
                            <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center border border-destructive/20 mb-4">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <DialogTitle className="text-center text-2xl">Limite Atingido!</DialogTitle>
                            <DialogDescription className="text-center text-muted-foreground pt-2">
                                Você consumiu todos os tokens do seu plano atual para este ciclo. Faça o upgrade agora para continuar acelerando suas criações sem limites!
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex sm:justify-center gap-3 mt-6">
                            <Button variant="outline" onClick={() => setShowTokenModal(false)} className="w-full sm:w-auto">Voltar</Button>
                            <Button onClick={() => router.push('/billing')} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">Fazer Upgrade</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* INPUT SECTION */}
                <Card className="border-border/50 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
                    <CardContent className="p-0">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                            <div className="p-6 pb-0">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="url"><LinkIcon className="w-4 h-4 mr-2" /> Colar Link</TabsTrigger>
                                    <TabsTrigger value="upload"><UploadCloud className="w-4 h-4 mr-2" /> Enviar Arquivo</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6 pt-6">
                                <TabsContent value="url" className="m-0 focus-visible:outline-none">
                                    <form onSubmit={handleGenerateUrl} className="space-y-4">
                                        <textarea
                                            placeholder="https://youtube.com/watch?v=...&#10;https://instagram.com/reel/..."
                                            required
                                            rows={4}
                                            className="w-full bg-background/50 border border-input rounded-xl flex min-h-[80px] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono"
                                            value={urls}
                                            onChange={(e) => setUrls(e.target.value)}
                                        />
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Select value={selectedFormat} onValueChange={(val) => { setSelectedFormat(val); fetchProfiles(val); setSelectedProfile("default"); }}>
                                                <SelectTrigger className="w-full sm:w-[160px] font-mono bg-background/50">
                                                    <SelectValue placeholder="Formato" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="instagram43">Instagram (1080x1350)</SelectItem>
                                                    <SelectItem value="reels">Reels (1080x1920)</SelectItem>
                                                    <SelectItem value="stories">Stories (1080x1920)</SelectItem>
                                                    <SelectItem value="feed">Feed Quadrado (1080x1080)</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                                                <SelectTrigger className="w-[140px] bg-background/50 text-emerald-600 font-bold border-emerald-500/20">
                                                    <SelectValue placeholder="Layout" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProfiles.map(p => (
                                                        <SelectItem key={p} value={p}>{p === "default" ? "🎨 Padrão" : `🎨 ${p}`}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedSocialProfile} onValueChange={setSelectedSocialProfile}>
                                                <SelectTrigger className="flex-1 bg-background/50 text-purple-600 font-bold border-purple-500/20">
                                                    <SelectValue placeholder="Identidade" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">👤 Padrão (Vazio)</SelectItem>
                                                    {availableSocialProfiles.map(p => (
                                                        <SelectItem key={p.name} value={p.name}>👤 {p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                                                {loading ? "Enviando..." : "Gerar Conteúdo"}
                                            </Button>
                                        </div>
                                    </form>
                                </TabsContent>

                                <TabsContent value="upload" className="m-0 focus-visible:outline-none">
                                    <form onSubmit={handleGenerateUpload} className="space-y-4">
                                        <div className="border-2 border-dashed border-input rounded-xl p-8 text-center bg-background/20 hover:bg-background/40 transition-colors">
                                            <input
                                                type="file"
                                                accept="video/*,image/*"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                className="mx-auto block text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Select value={selectedFormat} onValueChange={(val) => { setSelectedFormat(val); fetchProfiles(val); setSelectedProfile("default"); }}>
                                                <SelectTrigger className="w-full sm:w-[160px] font-mono bg-background/50">
                                                    <SelectValue placeholder="Formato" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="instagram43">Instagram (1080x1350)</SelectItem>
                                                    <SelectItem value="reels">Reels (1080x1920)</SelectItem>
                                                    <SelectItem value="stories">Stories (1080x1920)</SelectItem>
                                                    <SelectItem value="feed">Feed Quadrado (1080x1080)</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                                                <SelectTrigger className="w-[140px] bg-background/50 text-emerald-600 font-bold border-emerald-500/20">
                                                    <SelectValue placeholder="Layout" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProfiles.map(p => (
                                                        <SelectItem key={p} value={p}>{p === "default" ? "🎨 Padrão" : `🎨 ${p}`}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select value={selectedSocialProfile} onValueChange={setSelectedSocialProfile}>
                                                <SelectTrigger className="flex-1 bg-background/50 text-purple-600 font-bold border-purple-500/20">
                                                    <SelectValue placeholder="Identidade" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="default">👤 Padrão (Vazio)</SelectItem>
                                                    {availableSocialProfiles.map(p => (
                                                        <SelectItem key={p.name} value={p.name}>👤 {p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Button type="submit" disabled={loading || !file} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                                                {loading ? "Fazendo Upload..." : "Gerar Conteúdo"}
                                            </Button>
                                        </div>
                                    </form>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* HISTORY SECTION */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold flex items-center tracking-tight">
                            <Video className="w-5 h-5 mr-3 text-emerald-600" />
                            Minhas Criações
                        </h2>

                        {selectedIds.length > 0 && (
                            <Button
                                onClick={handleBulkDownload}
                                disabled={isExporting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            >
                                {isExporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                Exportar ZIP ({selectedIds.length})
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {generations.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground border border-border rounded-2xl border-dashed bg-card/30">
                                <Video className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                <p>Nenhum vídeo gerado ainda.</p>
                                <p className="text-sm">Escolha um link ou arquivo acima para começar!</p>
                            </div>
                        ) : (
                            generations.map((gen) => (
                                <Card key={gen.id} className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden transition-all hover:bg-card/80">
                                    <div className="p-5 flex flex-col">
                                        <div className="flex items-center w-full">

                                            {/* Checkbox para bulk action se estiver concluído */}
                                            <div className="mr-5 flex items-center h-full">
                                                {gen.status === "completed" ? (
                                                    <input
                                                        type="checkbox"
                                                        // Fallback to standard checkbox styling via basic tailwind 
                                                        className="w-5 h-5 rounded border-input bg-background text-emerald-600 focus:ring-emerald-500 focus:ring-offset-background cursor-pointer"
                                                        checked={selectedIds.includes(gen.id)}
                                                        onChange={() => toggleSelect(gen.id)}
                                                    />
                                                ) : (
                                                    <div className="w-5 h-5 rounded bg-muted/50 border border-border opacity-50 cursor-not-allowed"></div>
                                                )}
                                            </div>

                                            <div className="truncate pr-4 flex-1">
                                                <div className="flex items-center space-x-3 mb-1.5">
                                                    <span className="text-sm font-medium text-muted-foreground font-mono">#{gen.id}</span>
                                                    <Badge variant="secondary" className="px-2 py-0 text-[10px] uppercase font-semibold">{gen.input_type}</Badge>

                                                    <span className="text-xs text-muted-foreground flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {new Date(gen.created_at).toLocaleString('pt-BR')}
                                                    </span>
                                                    {gen.status === "completed" && (
                                                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2 py-0 text-xs font-normal">
                                                            <Coins className="w-3 h-3 mr-1" />
                                                            {gen.tokens_used} tokens
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="font-medium truncate text-foreground/90" title={gen.input_value}>{gen.input_value}</p>
                                            </div>

                                            <div className="flex flex-col items-end space-y-3">
                                                <div className="flex items-center space-x-4">
                                                    <StatusBadge status={gen.status} />

                                                    <div className="flex items-center space-x-1 border-l border-border pl-4 ml-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleFavorite(gen.id)}
                                                            className={`h-8 w-8 transition-colors ${gen.is_favorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground hover:text-foreground'}`}
                                                            title={gen.is_favorite ? "Desfavoritar" : "Favoritar"}
                                                        >
                                                            <Star className="w-4 h-4" fill={gen.is_favorite ? "currentColor" : "none"} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(gen.id)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                            title="Apagar Histórico"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {gen.status === "completed" && (
                                                    <div className="flex space-x-2">
                                                        {gen.result_media_path && (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                onClick={() => window.open(`http://localhost:8000/api/output/${gen.result_media_path?.split('\\').pop()?.split('/').pop()}`, "_blank")}
                                                            >
                                                                Abrir Vídeo
                                                            </Button>
                                                        )}
                                                        {gen.result_caption_path && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="h-8 text-xs"
                                                                onClick={() => {
                                                                    const a = document.createElement('a');
                                                                    a.href = `http://localhost:8000/api/output/${gen.result_caption_path?.split('\\').pop()?.split('/').pop()}`;
                                                                    a.download = '';
                                                                    a.click();
                                                                }}
                                                            >
                                                                Baixar Legenda
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                                {gen.status === "error" && (
                                                    <div className="flex items-center space-x-3 w-full justify-end">
                                                        <span className="text-xs text-destructive whitespace-pre-wrap break-words max-w-[400px]">
                                                            {gen.error_message}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRetry(gen.id)}
                                                            className="h-8 text-xs"
                                                        >
                                                            <RotateCcw className="w-3 h-3 mr-1.5" />
                                                            Tentar Novamente
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {gen.status === "completed" && (
                                            <div className="mt-5 pt-5 border-t border-border flex flex-col md:flex-row gap-5 w-full">
                                                {/* Video Player Embutido */}
                                                {gen.result_media_path && (
                                                    <div className="w-full md:w-1/2 bg-background/50 border border-border rounded-lg overflow-hidden flex items-center justify-center p-2">
                                                        <video
                                                            controls
                                                            className="w-full h-auto max-h-[350px] object-contain rounded-md"
                                                            src={`http://localhost:8000/api/output/${gen.result_media_path.split('\\').pop()?.split('/').pop()}`}
                                                        >
                                                            Seu navegador não suporta a visualização de vídeos HTML5.
                                                        </video>
                                                    </div>
                                                )}

                                                {/* Visualizador de Legendas */}
                                                {gen.result_caption_path && (
                                                    <div className={`w-full ${gen.result_media_path ? 'md:w-1/2' : ''} flex flex-col justify-start`}>
                                                        <div className="text-sm font-medium text-muted-foreground mb-1">Copywriting Gerado:</div>
                                                        <CaptionViewer captionPath={gen.result_caption_path} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
