"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isRegistering) {
                // Register flow
                await api.post("/auth/register", { username, password });
                setIsRegistering(false);
                setError("Conta criada com sucesso! Faça login.");
            } else {
                // Login flow
                // FastAPI expects form-data for login route using OAuth2PasswordRequestForm
                const formData = new URLSearchParams();
                formData.append("username", username);
                formData.append("password", password);

                const res = await api.post("/auth/login", formData);
                localStorage.setItem("token", res.data.access_token);
                window.location.href = "/dashboard"; // Força recarregamento total para limpar cache da sessão anterior
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Ambient background glow for aesthetics */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

            <Card className="w-full max-w-md shadow-2xl relative z-10 border-border/50 bg-card/80 backdrop-blur-xl">
                <CardHeader className="text-center pb-8">
                    <CardTitle className="text-3xl font-black tracking-tight text-white uppercase">
                        FEED <span className="text-emerald-500">READY</span>
                    </CardTitle>
                    <CardDescription className="text-zinc-400 mt-2">
                        {isRegistering
                            ? "Crie sua conta para começar"
                            : "Entre para gerar conteúdos automaticamente"}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/50 text-destructive text-sm p-3 rounded-md mb-6 text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-400">
                                Usuário
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                required
                                className="bg-background/50 border-border/50 focus-visible:ring-primary/50"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-400">
                                Senha
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                className="bg-background/50 border-border/50 focus-visible:ring-primary/50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 font-semibold"
                            size="lg"
                        >
                            {loading ? "Aguarde..." : isRegistering ? "Criar Conta" : "Entrar"}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center pt-2 pb-6">
                    <Button
                        variant="link"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError("");
                        }}
                        className="text-sm text-zinc-500 hover:text-white transition-colors h-auto p-0"
                    >
                        {isRegistering
                            ? "Já tem conta? Faça login"
                            : "Não tem conta? Registre-se"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
