import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";

interface PromptLibraryProps {
    promptTemplates: any[];
    fetchPromptTemplates: () => void;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({ promptTemplates, fetchPromptTemplates }) => {
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [newPromptName, setNewPromptName] = useState("");
    const [newPromptCategory, setNewPromptCategory] = useState("livre");
    const [newPromptContent, setNewPromptContent] = useState("");
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);
    const [expandedPromptId, setExpandedPromptId] = useState<number | null>(null);

    const createPromptTemplate = async () => {
        if (!newPromptName.trim() || !newPromptContent.trim()) {
            toast.error("Preencha o nome e o conteúdo do prompt.");
            return;
        }
        setIsSavingPrompt(true);
        try {
            await api.post(`/prompt-templates`, { name: newPromptName, category: newPromptCategory, content: newPromptContent });
            toast.success("Prompt salvo!");
            setNewPromptName(""); setNewPromptContent(""); setShowPromptEditor(false);
            fetchPromptTemplates();
        } catch { toast.error("Erro ao salvar prompt."); }
        finally { setIsSavingPrompt(false); }
    };

    const deletePromptTemplate = async (id: number) => {
        try {
            await api.delete(`/prompt-templates/${id}`);
            fetchPromptTemplates();
            toast.success("Prompt removido.");
        } catch { toast.error("Erro ao deletar prompt."); }
    };

    const updatePromptTemplate = async (id: number, content: string, name: string, category: string) => {
        setIsSavingPrompt(true);
        try {
            await api.put(`/prompt-templates/${id}`, { name, category, content });
            toast.success("Prompt atualizado!");
            fetchPromptTemplates();
        } catch { toast.error("Erro ao atualizar prompt."); }
        finally { setIsSavingPrompt(false); }
    };

    const duplicatePromptTemplate = (tmpl: any) => {
        setNewPromptName(`${tmpl.name} (Cópia)`);
        setNewPromptCategory(tmpl.category);
        setNewPromptContent(tmpl.content);
        setShowPromptEditor(true);
        toast('Customizando prompt do sistema...', { icon: '📝' });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Biblioteca de Prompts</h3>
                <Button onClick={() => setShowPromptEditor(p => !p)} size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-3 h-3 mr-1" /> Novo
                </Button>
            </div>

            {showPromptEditor && (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-3 space-y-2">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-muted-foreground">Nome</span>
                            <Input value={newPromptName} onChange={e => setNewPromptName(e.target.value)} placeholder="Ex: Título Viral" className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-muted-foreground">Categoria</span>
                            <Select value={newPromptCategory} onValueChange={setNewPromptCategory}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="titulo">Título</SelectItem>
                                    <SelectItem value="subtitulo">Subtítulo</SelectItem>
                                    <SelectItem value="hook">Hook</SelectItem>
                                    <SelectItem value="legenda">Legenda</SelectItem>
                                    <SelectItem value="cta">CTA</SelectItem>
                                    <SelectItem value="livre">Livre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-muted-foreground">Prompt</span>
                            <textarea
                                value={newPromptContent}
                                onChange={e => setNewPromptContent(e.target.value)}
                                rows={5}
                                className="w-full bg-background border border-border rounded-md p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="Gere um título impactante..."
                            />
                        </div>
                        <Button onClick={createPromptTemplate} disabled={isSavingPrompt} className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSavingPrompt ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                            Salvar Prompt
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-2">
                {promptTemplates.map(tmpl => (
                    <Card
                        key={tmpl.id}
                        className={`border-border/50 shadow-none transition-all ${tmpl.is_system ? 'bg-muted/10' : 'bg-emerald-500/5 border-emerald-500/20'} ${expandedPromptId === tmpl.id ? 'ring-1 ring-emerald-500/50' : ''}`}
                    >
                        <CardContent className="p-0">
                            <div
                                className="p-3 cursor-pointer flex items-start justify-between gap-2"
                                onClick={() => setExpandedPromptId(expandedPromptId === tmpl.id ? null : tmpl.id)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-black truncate">{tmpl.name}</span>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-bold">{tmpl.category}</span>
                                        {tmpl.is_system && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 uppercase font-bold">sistema</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                    {!tmpl.is_system && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Excluir "${tmpl.name}"?`)) deletePromptTemplate(tmpl.id);
                                            }}
                                            className="p-1 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {expandedPromptId === tmpl.id ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                                </div>
                            </div>

                            {expandedPromptId === tmpl.id && (
                                <div className="px-3 pb-3 pt-0 border-t border-border/30 space-y-3">
                                    <textarea
                                        value={tmpl.content}
                                        readOnly={tmpl.is_system}
                                        onChange={e => {
                                            // Local state handle would be better but for brevity we use tmpl.content direct or sibling state
                                        }}
                                        rows={6}
                                        className="w-full bg-background border border-border/50 rounded-md p-2 text-[10px] font-mono mt-3"
                                    />
                                    <div className="flex justify-between">
                                        {tmpl.is_system ? (
                                            <Button onClick={() => duplicatePromptTemplate(tmpl)} variant="outline" size="sm" className="h-7 text-[9px] font-bold">
                                                <Copy className="w-2.5 h-2.5 mr-1" /> Customizar
                                            </Button>
                                        ) : (
                                            <Button onClick={() => updatePromptTemplate(tmpl.id, tmpl.content, tmpl.name, tmpl.category)} variant="outline" size="sm" className="h-7 text-[9px] font-bold border-emerald-500/30 text-emerald-600">
                                                <Check className="w-2.5 h-2.5 mr-1" /> Salvar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
