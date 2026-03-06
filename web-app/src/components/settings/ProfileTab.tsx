import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";

interface ProfileTabProps {
    socialProfileName: string;
    profileIdentity: any;
    setProfileIdentity: React.Dispatch<React.SetStateAction<any>>;
    fetchProfileIdentity: () => void;
    fetchSocialProfiles: () => void;
    globalVars: Record<string, string>;
    setGlobalVars: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    fetchGlobalVars: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
    socialProfileName, profileIdentity, setProfileIdentity, fetchProfileIdentity, fetchSocialProfiles,
    globalVars, setGlobalVars, fetchGlobalVars
}) => {
    const [isSavingIdentity, setIsSavingIdentity] = useState(false);
    const [isSavingGlobal, setIsSavingGlobal] = useState(false);

    // Custom vars for identity
    const [customVarKey, setCustomVarKey] = useState("");
    const [customVarValue, setCustomVarValue] = useState("");

    // Global vars for user
    const [globalVarKey, setGlobalVarKey] = useState("");
    const [globalVarValue, setGlobalVarValue] = useState("");

    const [newProfileName, setNewProfileName] = useState("");

    const saveProfileIdentity = async () => {
        if (socialProfileName === "default") {
            toast.error("Selecione ou crie um perfil real para salvar.");
            return;
        }
        setIsSavingIdentity(true);
        try {
            await api.put(`/social-profiles/${encodeURIComponent(socialProfileName)}`, {
                name: socialProfileName,
                ...profileIdentity
            });
            toast.success("Identidade salva!");
        } catch { toast.error("Erro ao salvar identidade."); }
        finally { setIsSavingIdentity(false); }
    };

    const saveGlobalVariables = async () => {
        setIsSavingGlobal(true);
        try {
            await api.put(`/user/variables`, globalVars);
            toast.success("Variáveis globais salvas!");
        } catch { toast.error("Erro ao salvar globais."); }
        finally { setIsSavingGlobal(false); }
    };

    const createProfile = async () => {
        if (!newProfileName.trim()) return;
        try {
            await api.post("/social-profiles", { name: newProfileName.trim() });
            toast.success("Perfil criado!");
            setNewProfileName("");
            fetchSocialProfiles();
        } catch { toast.error("Erro ao criar perfil."); }
    };

    const deleteProfile = async () => {
        if (socialProfileName === "default") return;
        if (!confirm(`Tem certeza que deseja excluir o perfil "${socialProfileName}"?`)) return;
        try {
            // Need to find ID for delete if name is not supported as PK, 
            // but let's assume we can find it. 
            // Actually, the route uses profile_id. I'll need to find the id.
            const res = await api.get(`/social-profiles/${encodeURIComponent(socialProfileName)}`);
            const id = res.data.id;
            await api.delete(`/social-profiles/${id}`);
            toast.success("Perfil excluído!");
            fetchSocialProfiles();
        } catch { toast.error("Erro ao excluir perfil."); }
    };

    return (
        <div className="p-4 space-y-6 pb-20">
            {/* --- GLOBALS --- */}
            <section className="space-y-3">
                <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest pl-1">Variáveis Globais (Conta)</h3>
                <Card className="border-purple-500/20 shadow-none bg-purple-500/5">
                    <CardContent className="p-3 space-y-3">
                        <p className="text-[9px] text-muted-foreground">Disponíveis em todos os layouts e perfis.</p>
                        <div className="rounded-md bg-muted/50 border border-border/50 p-2 text-[9px] text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground/80">Como usar:</p>
                            <p><strong>Nome da variável</strong> = o que você digita em &quot;chave&quot; (ex: <code className="bg-muted px-1 rounded">canal</code>).</p>
                            <p>Nos prompts e na biblioteca, escreva <code className="bg-muted px-1 rounded text-purple-600 font-mono">!&#123;canal&#125;</code> — será substituído pelo valor ao gerar.</p>
                        </div>
                        {Object.entries(globalVars || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2 bg-muted/30 rounded p-2">
                                <code className="text-[10px] font-mono text-purple-500 shrink-0">!&#123;{k}&#125;</code>
                                <span className="text-xs text-muted-foreground truncate flex-1">{v as string}</span>
                                <button onClick={() => {
                                    const copy = { ...globalVars };
                                    delete copy[k];
                                    setGlobalVars(copy);
                                }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                        <div className="flex gap-1.5 pt-2 border-t border-border/30">
                            <Input value={globalVarKey} onChange={e => setGlobalVarKey(e.target.value)} placeholder="nome (ex: canal)" className="h-7 text-xs w-28" />
                            <Input value={globalVarValue} onChange={e => setGlobalVarValue(e.target.value)} placeholder="valor" className="h-7 text-xs flex-1" />
                            <Button size="sm" onClick={() => {
                                if (!globalVarKey.trim()) return;
                                setGlobalVars(p => ({ ...p, [globalVarKey.trim()]: globalVarValue }));
                                setGlobalVarKey(""); setGlobalVarValue("");
                            }} className="h-7 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs">+</Button>
                        </div>
                        <Button onClick={saveGlobalVariables} disabled={isSavingGlobal} size="sm" className="w-full h-8 text-[10px] font-bold bg-purple-600">
                            {isSavingGlobal ? "Salvando..." : "Salvar Globais"}
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* --- PROFILES --- */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Identidade do Perfil</h3>
                    {socialProfileName !== "default" && (
                        <button onClick={deleteProfile} className="text-[9px] font-bold text-red-500 hover:underline">Excluir Perfil</button>
                    )}
                </div>

                <Card className="border-border/50 shadow-none bg-muted/10">
                    <CardContent className="p-3 space-y-3">
                        {socialProfileName === "default" ? (
                            <div className="space-y-3">
                                <p className="text-[10px] text-muted-foreground text-center">Nenhuma identidade selecionada.</p>
                                <div className="flex gap-2">
                                    <Input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Nome do Perfil (ex: @Marcos)" className="h-8 text-xs flex-1" />
                                    <Button onClick={createProfile} size="sm" className="bg-emerald-600 h-8"><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {['display_name', 'username', 'contact', 'genre'].map((field) => (
                                    <div key={field} className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            {field.replace('_', ' ')}
                                        </span>
                                        <Input
                                            value={profileIdentity[field] || ""}
                                            onChange={e => setProfileIdentity((p: any) => ({ ...p, [field]: e.target.value }))}
                                            placeholder={`Ex: ${field}`}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                ))}

                                <div className="space-y-2 pt-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Variáveis do Perfil</span>
                                    <p className="text-[9px] text-muted-foreground">Chave = nome da variável. Use <code className="font-mono text-emerald-600 bg-muted/50 px-1 rounded">!&#123;chave&#125;</code> nos prompts para inserir o valor.</p>
                                    {Object.entries(profileIdentity.custom_vars || {}).map(([k, v]) => (
                                        <div key={k} className="flex items-center gap-2 bg-muted/30 rounded p-2">
                                            <code className="text-[10px] font-mono text-emerald-500 shrink-0">!&#123;{k}&#125;</code>
                                            <span className="text-xs text-muted-foreground truncate flex-1">{v as string}</span>
                                            <button onClick={() => {
                                                const copy = { ...profileIdentity.custom_vars };
                                                delete copy[k];
                                                setProfileIdentity((p: any) => ({ ...p, custom_vars: copy }));
                                            }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                    <div className="flex gap-1.5">
                                        <Input value={customVarKey} onChange={e => setCustomVarKey(e.target.value)} placeholder="nome (ex: produto)" className="h-7 text-xs w-24" />
                                        <Input value={customVarValue} onChange={e => setCustomVarValue(e.target.value)} placeholder="valor" className="h-7 text-xs flex-1" />
                                        <Button size="sm" onClick={() => {
                                            if (!customVarKey.trim()) return;
                                            setProfileIdentity((p: any) => ({ ...p, custom_vars: { ...p.custom_vars, [customVarKey.trim()]: customVarValue } }));
                                            setCustomVarKey(""); setCustomVarValue("");
                                        }} className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">+</Button>
                                    </div>
                                </div>

                                <Button onClick={saveProfileIdentity} disabled={isSavingIdentity} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs mt-2">
                                    {isSavingIdentity ? "Salvando..." : "Salvar Identidade"}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};
