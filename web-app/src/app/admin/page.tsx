"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
    Shield, Users, CreditCard, Trash2, Lock, Unlock,
    RefreshCw, Save, Crown, ChevronDown, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
    id: number;
    username: string;
    plan: string;
    has_access: boolean;
    is_superuser: boolean;
    usage: number;
    limit: number;
    created_at: string | null;
}

interface PlanConfig {
    limit: number;
    price: number;
}

export default function AdminPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"users" | "plans">("users");

    // Users state
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Plans state
    const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
    const [plansLoading, setPlansLoading] = useState(false);
    const [plansSaving, setPlansSaving] = useState(false);

    // Modals
    const [changePlanModal, setChangePlanModal] = useState<{ userId: number, username: string } | null>(null);
    const [selectedPlan, setSelectedPlan] = useState("gratuito");

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await api.get("/auth/me");
            if (!res.data.is_superuser) {
                router.push("/dashboard");
                return;
            }
            setAuthorized(true);
            fetchUsers();
            fetchPlans();
        } catch {
            router.push("/auth/login");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get("/admin/users");
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchPlans = async () => {
        setPlansLoading(true);
        try {
            const res = await api.get("/admin/plans");
            setPlans(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setPlansLoading(false);
        }
    };

    const toggleAccess = async (userId: number, currentAccess: boolean) => {
        try {
            await api.put(`/admin/users/${userId}/access`, { has_access: !currentAccess });
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    const resetTokens = async (userId: number) => {
        if (!confirm("Tem certeza que deseja zerar os tokens deste usuário neste mês?")) return;
        try {
            await api.put(`/admin/users/${userId}/reset-tokens`);
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    const deleteUser = async (userId: number) => {
        if (!confirm("ATENÇÃO: Isso irá excluir permanentemente o usuário e TODAS as suas gerações. Continuar?")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Erro ao excluir");
        }
    };

    const changePlan = async () => {
        if (!changePlanModal) return;
        try {
            await api.put(`/admin/users/${changePlanModal.userId}/plan`, { plan: selectedPlan });
            setChangePlanModal(null);
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    const savePlans = async () => {
        setPlansSaving(true);
        try {
            await api.put("/admin/plans", plans);
            alert("Planos salvos com sucesso!");
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar planos.");
        } finally {
            setPlansSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!authorized) return null;

    return (
        <div className="min-h-screen bg-background text-foreground p-8 pt-28">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase">Painel <span className="text-emerald-600">Administrativo</span></h1>
                        <p className="text-muted-foreground text-sm">Controle total sobre usuários, planos e configurações.</p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="mb-8 grid w-full max-w-[400px] grid-cols-2">
                        <TabsTrigger value="users" className="flex items-center gap-2" onClick={() => setActiveTab("users")}>
                            <Users className="w-4 h-4" /> Usuários
                        </TabsTrigger>
                        <TabsTrigger value="plans" className="flex items-center gap-2" onClick={() => setActiveTab("plans")}>
                            <CreditCard className="w-4 h-4" /> Planos
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== USERS TAB ========== */}
                    <TabsContent value="users" className="mt-0">
                        <Card className="border-border shadow-sm bg-card/50">
                            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                                <div>
                                    <CardTitle>Todos os Usuários ({users.length})</CardTitle>
                                    <CardDescription>Gerencie o status e consumo de tokens dos clientes.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={usersLoading}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? "animate-spin" : ""}`} />
                                    Atualizar
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-border/50">
                                            <TableHead className="w-[80px]">ID</TableHead>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Plano</TableHead>
                                            <TableHead>Tokens (Mês)</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map(u => (
                                            <TableRow key={u.id} className="border-b-border/30 hover:bg-muted/30">
                                                <TableCell className="font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{u.username}</span>
                                                        {u.is_superuser && (
                                                            <span title="Superusuário"><Crown className="w-3.5 h-3.5 text-amber-500" /></span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">{u.plan}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-xs text-muted-foreground">
                                                            {u.usage.toLocaleString("pt-BR")} / {u.limit.toLocaleString("pt-BR")}
                                                        </span>
                                                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${u.usage >= u.limit ? "bg-destructive" : "bg-emerald-500"}`}
                                                                style={{ width: `${Math.min((u.usage / u.limit) * 100, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {u.has_access ? (
                                                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/10">Ativo</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 hover:bg-destructive/10">Bloqueado</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => toggleAccess(u.id, u.has_access)}
                                                            className={u.has_access ? "hover:text-destructive hover:bg-destructive/10" : "hover:text-emerald-500 hover:bg-emerald-500/10"}
                                                            title={u.has_access ? "Bloquear" : "Liberar"}
                                                        >
                                                            {u.has_access ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => { setChangePlanModal({ userId: u.id, username: u.username }); setSelectedPlan(u.plan); }}
                                                            className="hover:text-emerald-600 hover:bg-emerald-500/10"
                                                            title="Alterar Plano"
                                                        >
                                                            <ChevronDown className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => resetTokens(u.id)}
                                                            className="hover:text-amber-500 hover:bg-amber-500/10"
                                                            title="Zerar Tokens do Mês"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </Button>
                                                        {!u.is_superuser && (
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                onClick={() => deleteUser(u.id)}
                                                                className="hover:text-destructive hover:bg-destructive/10"
                                                                title="Excluir Permanentemente"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ========== PLANS TAB ========== */}
                    <TabsContent value="plans" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {Object.entries(plans).map(([name, config]) => (
                                <Card key={name} className="bg-card/50 border-border">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-bold capitalize">{name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="uppercase tracking-wider text-xs text-muted-foreground">Limite de Tokens</Label>
                                            <Input
                                                type="number"
                                                value={config.limit}
                                                onChange={e => setPlans(prev => ({
                                                    ...prev,
                                                    [name]: { ...prev[name], limit: parseInt(e.target.value) || 0 }
                                                }))}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="uppercase tracking-wider text-xs text-muted-foreground">Preço (R$)</Label>
                                            <Input
                                                type="number"
                                                value={config.price}
                                                onChange={e => setPlans(prev => ({
                                                    ...prev,
                                                    [name]: { ...prev[name], price: parseInt(e.target.value) || 0 }
                                                }))}
                                                className="bg-background"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Button
                            onClick={savePlans}
                            disabled={plansSaving}
                            className="font-semibold"
                            size="lg"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {plansSaving ? "Salvando..." : "Salvar Alterações nos Planos"}
                        </Button>
                    </TabsContent>
                </Tabs>

                {/* ========== CHANGE PLAN MODAL ========== */}
                <Dialog open={!!changePlanModal} onOpenChange={(open) => !open && setChangePlanModal(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Alterar Plano</DialogTitle>
                            <DialogDescription>
                                Alterando plano de <span className="text-foreground font-medium">{changePlanModal?.username}</span>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um plano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(plans).map(p => (
                                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setChangePlanModal(null)}>Cancelar</Button>
                            <Button onClick={changePlan}>Confirmar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
