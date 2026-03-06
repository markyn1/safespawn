"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
    Folder, Image as ImageIcon, FileText, Type, PaintBucket,
    Save, Upload, ChevronRight, LayoutTemplate, Shield
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function DesignsManagerPage() {
    const [themes, setThemes] = useState<string[]>([]);
    const [activeTheme, setActiveTheme] = useState<string>("default");
    const [structure, setStructure] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<"model" | "prompt" | "assets">("model");
    const [activePrompt, setActivePrompt] = useState<string>("");

    // States for Model Editor
    const [profile, setProfile] = useState<any>(null);
    // States for Prompt Editor
    const [promptContent, setPromptContent] = useState<string>("");
    const [promptSource, setPromptSource] = useState<"user" | "default">("default");

    // Superuser check
    const [isSuperuser, setIsSuperuser] = useState(false);

    useEffect(() => {
        fetchThemes();
        api.get("/auth/me").then(res => setIsSuperuser(!!res.data.is_superuser)).catch(() => { });
    }, []);

    useEffect(() => {
        if (activeTheme) {
            fetchThemeStructure(activeTheme);
            if (activeTab === "model") {
                fetchModel(activeTheme);
            }
        }
    }, [activeTheme]);

    const fetchThemes = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/themes`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setThemes(data);
                if (data.length > 0 && !activeTheme) setActiveTheme(data[0]);
            }
        } catch (error) {
            toast.error("Erro ao carregar temas.");
        }
    };

    const fetchThemeStructure = async (theme: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/${theme}/structure`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStructure(data);
                if (data.prompts && data.prompts.length > 0 && !activePrompt) {
                    setActivePrompt(data.prompts[0]);
                }
            }
        } catch (error) {
            toast.error("Erro ao carregar estrutura do tema.");
        } finally {
            setLoading(false);
        }
    };

    const fetchModel = async (theme: string) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/${theme}/model`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (error) {
            toast.error("Erro ao carregar model.py do tema.");
        }
    };

    const fetchPrompt = async (theme: string, filename: string) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/${theme}/prompts/${filename}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPromptContent(data.content);
                setPromptSource(data.source === "user" ? "user" : "default");
            }
        } catch (error) {
            toast.error("Erro ao carregar o prompt.");
        }
    };

    const resetPromptToDefault = async () => {
        if (!activeTheme || !activePrompt) return;
        const token = localStorage.getItem("token");
        try {
            await fetch(`http://localhost:8000/api/designs_manager/${activeTheme}/prompts/${activePrompt}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            toast.success("Prompt resetado para o padrão global.");
            await fetchPrompt(activeTheme, activePrompt);
        } catch {
            toast.error("Erro ao resetar prompt.");
        }
    };

    useEffect(() => {
        if (activeTab === "prompt" && activeTheme && activePrompt) {
            fetchPrompt(activeTheme, activePrompt);
        }
    }, [activeTab, activePrompt]);

    const saveModel = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/${activeTheme}/model`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ profile })
            });
            if (res.ok) {
                toast.success("Perfil de Identidade salvo!");
            } else {
                toast.error("Falha ao salvar Model.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        }
    };

    const savePrompt = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/${activeTheme}/prompts/${activePrompt}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ content: promptContent })
            });
            if (res.ok) {
                toast.success("Prompt pessoal salvo!");
                setPromptSource("user"); // Badge flips to "✎ Personalizado" immediately
            } else {
                toast.error("Falha ao salvar Prompt.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        }
    };

    const uploadFile = async (file: File) => {
        if (!file) return;

        // Auto-route by file extension — user never sees folder names
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const fontExts = ["ttf", "otf", "woff", "woff2"];
        const imageExts = ["png", "jpg", "jpeg", "webp", "svg"];

        let folder: string;
        if (fontExts.includes(ext)) {
            folder = "fonts";
        } else if (imageExts.includes(ext)) {
            folder = "assets";
        } else {
            toast.error(`Tipo de arquivo não suportado (.${ext}). Envie imagens (.png, .jpg, .webp) ou fontes (.ttf, .otf, .woff).`);
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const toastId = toast.loading("Enviando arquivo...");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/api/designs_manager/${activeTheme}/upload/${folder}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                toast.success("Arquivo adicionado!", { id: toastId });
                fetchThemeStructure(activeTheme);
            } else {
                toast.error("Erro ao enviar arquivo.", { id: toastId });
            }
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground pt-20">
            {/* Split Screen Layout Div */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Esquerda - Temas e Arquivos */}
                <div className="w-64 bg-card border-r border-border p-4 flex flex-col h-full overflow-y-auto">
                    <h2 className="text-xl font-bold text-emerald-600 mb-6 flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-emerald-600" /> Designs
                    </h2>

                    <div className="mb-8">
                        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Tema Ativo</label>
                        <div className="flex flex-col gap-2">
                            {themes.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setActiveTheme(t)}
                                    className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${activeTheme === t ? "bg-muted/80 text-foreground border border-border shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        }`}
                                >
                                    <span className="flex items-center gap-2"><Folder className="w-4 h-4" /> {t}</span>
                                    {activeTheme === t && <ChevronRight className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!loading && structure && (
                        <div>
                            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Explorador</label>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => { setActiveTab("model"); fetchModel(activeTheme); }} className={`text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${activeTab === "model" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                                    <PaintBucket className="w-4 h-4" /> Identidade Visual
                                </button>

                                <button onClick={() => setActiveTab("prompt")} className={`text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${activeTab === "prompt" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                                    <FileText className="w-4 h-4" /> Editor de Prompts
                                </button>

                                <button onClick={() => setActiveTab("assets")} className={`text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${activeTab === "assets" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                                    <ImageIcon className="w-4 h-4" /> Galeria de Assets
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Area Direita */}
                <div className="flex-1 overflow-y-auto bg-background/50 flex flex-col">
                    {/* Header fixo da Aba */}
                    <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-6 z-10 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                                {activeTab === "model" && <><PaintBucket className="w-6 h-6 text-emerald-500" /> Identidade da Marca (model.py)</>}
                                {activeTab === "prompt" && <><FileText className="w-6 h-6 text-emerald-500" /> Comportamento do Cérebro (Prompts)</>}
                                {activeTab === "assets" && <><ImageIcon className="w-6 h-6 text-emerald-500" /> Gerenciador de Arquivos Brutos</>}
                            </h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                {activeTab === "model" && "Gerencie o comportamento da IA. Cores e fontes agora são configuradas por layout em Layouts."}
                                {activeTab === "prompt" && "Edite os textos reais que a IA recebe no Back-end antes de gerar a Copy, Hooks e Áudios."}
                                {activeTab === "assets" && "Faça upload de Fontes (.ttf) e Assets (.png, .jpg) para este tema."}
                            </p>
                        </div>

                        {activeTab === "model" && (
                            <Button onClick={saveModel} className="font-semibold">
                                <Save className="w-4 h-4 mr-2" /> Salvar Identidade
                            </Button>
                        )}
                        {activeTab === "prompt" && (
                            <div className="flex gap-2">
                                <Button onClick={savePrompt}>
                                    <Save className="w-4 h-4 mr-2" /> Atualizar Prompt
                                </Button>
                                {isSuperuser && (
                                    <Button
                                        variant="destructive"
                                        className="font-semibold"
                                        onClick={async () => {
                                            try {
                                                await api.put(`/admin/defaults/prompts/${activePrompt}`, { content: promptContent });
                                                toast.success("Prompt salvo como padrão global!");
                                            } catch {
                                                toast.error("Erro ao salvar prompt global.");
                                            }
                                        }}
                                    >
                                        <Shield className="w-4 h-4 mr-2" /> Salvar como Padrão
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Conteúdo Renderizado Pela Tab */}
                    <div className="p-8 max-w-5xl mx-auto w-full">
                        {loading ? (
                            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : (
                            <>
                                {/* TAB: IDENTIDADE / MODEL.PY */}
                                {activeTab === "model" && profile && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-muted border border-border rounded-xl p-4 text-sm text-foreground/80 flex items-start gap-3 shadow-sm">
                                            <span className="text-lg">🎨</span>
                                            <span>
                                                <strong>Cores e fontes</strong> foram movidas para
                                                {" "} <a href="/layout" className="underline hover:text-primary">Layouts</a>.
                                                Cada perfil de layout tem sua própria paleta e fonte configuráveis.
                                            </span>
                                        </div>

                                        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-foreground"><Type className="w-5 h-5 text-muted-foreground" /> Comportamento da Inteligência</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                {Object.entries(profile.ai_behavior).map(([key, value]) => (
                                                    <div key={key} className="flex flex-col gap-1.5">
                                                        <label className="text-sm font-medium text-muted-foreground capitalize">{key.replace("_", " ")}</label>
                                                        <Input
                                                            type={typeof value === "number" ? "number" : "text"}
                                                            value={value as string | number}
                                                            onChange={(e) => setProfile({
                                                                ...profile,
                                                                ai_behavior: {
                                                                    ...profile.ai_behavior,
                                                                    [key]: typeof value === "number" ? Number(e.target.value) : e.target.value
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: PROMPTS EDITOR */}
                                {activeTab === "prompt" && structure && (
                                    <div className="flex gap-6 h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="w-1/4 bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
                                            <div className="p-4 border-b border-border bg-muted/50 font-medium text-foreground">Arquivos .txt</div>
                                            <div className="flex flex-col p-2 gap-1 overflow-y-auto">
                                                {structure.prompts.map((p: string) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setActivePrompt(p)}
                                                        className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${activePrompt === p ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden relative shadow-sm">
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                                                <Badge variant={promptSource === "user" ? "default" : "secondary"} className="font-semibold">
                                                    {promptSource === "user" ? "✎ Personalizado" : "Padrão global"}
                                                </Badge>
                                                {promptSource === "user" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={resetPromptToDefault}
                                                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                                    >
                                                        ↺ Resetar para padrão
                                                    </Button>
                                                )}
                                            </div>
                                            <Textarea
                                                value={promptContent}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptContent(e.target.value)}
                                                className="w-full h-full bg-transparent border-0 text-foreground p-6 font-mono text-sm leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none placeholder:text-muted-foreground/50"
                                                placeholder="Conteúdo do prompt..."
                                                spellCheck={false}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: ASSETS GALLERY — abstracted */}
                                {activeTab === "assets" && structure && (() => {
                                    const imageExts = ["png", "jpg", "jpeg", "webp", "svg"];
                                    const fontExts = ["ttf", "otf", "woff", "woff2"];

                                    const images = [...(structure.assets ?? [])].filter((f: string) =>
                                        imageExts.includes(f.split(".").pop()?.toLowerCase() ?? "")
                                    );
                                    const fonts = [...(structure.fonts ?? [])].filter((f: string) =>
                                        fontExts.includes(f.split(".").pop()?.toLowerCase() ?? "")
                                    );

                                    const Section = ({ title, icon, files, folder }: { title: string; icon: string; files: string[]; folder: string }) => (
                                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                            <div className="p-4 border-b border-border bg-muted/50 flex justify-between items-center">
                                                <h3 className="font-medium text-foreground flex items-center gap-2">
                                                    <span>{icon}</span>{title}
                                                </h3>
                                                <label className="cursor-pointer">
                                                    <Button variant="default" size="sm" asChild className="gap-2">
                                                        <span>
                                                            <Upload className="w-4 h-4" /> Adicionar
                                                        </span>
                                                    </Button>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept={folder === "fonts" ? ".ttf,.otf,.woff,.woff2" : ".png,.jpg,.jpeg,.webp,.svg"}
                                                        onChange={(e) => e.target.files && uploadFile(e.target.files[0])}
                                                    />
                                                </label>
                                            </div>
                                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {files.length === 0 ? (
                                                    <span className="text-muted-foreground text-sm col-span-4">Nenhum arquivo adicionado ainda.</span>
                                                ) : files.map((item: string) => (
                                                    <div key={item} className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg border border-border/50 text-center gap-2 hover:border-border transition-colors">
                                                        {imageExts.includes(item.split(".").pop()?.toLowerCase() ?? "") ? (
                                                            <div className="w-16 h-16 bg-muted/50 rounded mb-1 overflow-hidden flex items-center justify-center">
                                                                <img
                                                                    src={`http://localhost:8000/api/designs/${activeTheme}/${folder}/${item}`}
                                                                    className="max-w-full max-h-full object-contain"
                                                                    alt={item}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mb-1">
                                                                <span className="text-xl">🔤</span>
                                                            </div>
                                                        )}
                                                        {/* Show only the filename without path context */}
                                                        <span className="text-xs text-muted-foreground break-all">
                                                            {item.replace(/\.[^/.]+$/, "")}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                                                            {item.split(".").pop()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-xl p-4">
                                                Adicione imagens de fundo, logos ou fontes personalizadas. O sistema organiza automaticamente.
                                            </div>
                                            <Section title="Imagens & Fundos" icon="🖼️" files={images} folder="assets" />
                                            <Section title="Fontes Personalizadas" icon="🔤" files={fonts} folder="fonts" />
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
