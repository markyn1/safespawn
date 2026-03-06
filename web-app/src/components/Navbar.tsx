"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutTemplate, Settings, CreditCard, Zap, Shield, LogOut, User, Home } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [profile, setProfile] = useState<{ username: string, usage: number, limit: number, plan: string, is_superuser?: boolean } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            api.get("/auth/me")
                .then(res => setProfile(res.data))
                .catch(() => { });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        setProfile(null);
        window.location.href = "/auth/login";
    };

    const navItems = [
        { label: "Dashboard", icon: Home, path: "/dashboard" },
        { label: "Layouts", icon: LayoutTemplate, path: "/layout" },
        { label: "Designs", icon: Settings, path: "/designs" },
        { label: "Planos", icon: CreditCard, path: "/billing" },
        { label: "Ajuda", icon: HelpCircle, path: "/help" },
    ];

    if (profile?.is_superuser) {
        navItems.push({ label: "Admin", icon: Shield, path: "/admin" });
    }

    if (pathname === "/auth/login") return null;

    return (
        <>
            {/* Top Navbar (Desktop + Logo on Mobile) */}
            <header className="fixed top-0 left-0 w-full h-16 border-b bg-background/80 backdrop-blur-md z-50 px-4 md:px-8 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/dashboard')}>
                    <div className="w-9 h-9 rounded-md bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md transition-all active:scale-95">
                        FR
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black tracking-tight text-foreground leading-none hidden sm:block">
                            FEED <span className="text-emerald-600">READY</span>
                        </h1>
                        <span className="text-[10px] text-muted-foreground font-bold tracking-widest hidden sm:block">AUTO-PILOT</span>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center bg-muted/30 p-1 rounded-full border border-border/50">
                    {navItems.map((item) => (
                        <Button
                            key={item.path}
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(item.path)}
                            className={cn(
                                "rounded-full px-4 h-8 transition-colors hover:bg-background hover:text-emerald-600 font-medium",
                                pathname === item.path ? "bg-background text-emerald-600 shadow-sm border border-border/50" : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="w-4 h-4 mr-2" />
                            {item.label}
                        </Button>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    {profile && (
                        <div className="hidden lg:flex flex-col items-end mr-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className={cn("w-3 h-3", profile.usage >= profile.limit ? "text-destructive" : "text-emerald-600")} />
                                <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground/80">
                                    {Math.max(0, profile.limit - profile.usage).toLocaleString("pt-BR")} TOKENS DISPONÍVEIS
                                </span>
                            </div>
                            <Progress
                                value={Math.min((profile.usage / profile.limit) * 100, 100)}
                                className="w-32 h-1.5 bg-muted progress-solid"
                            />
                        </div>
                    )}

                    <ThemeToggle />

                    {profile ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative flex items-center gap-2 px-1 pl-2 rounded-full border border-border/50 hover:bg-muted/50 transition-colors">
                                    <span className="hidden md:block text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider">{profile.username}</span>
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-emerald-600 text-white text-[10px] font-black uppercase">
                                            {profile.username?.substring(0, 2) || "FR"}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground capitalize">
                                            Plano {profile.plan}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/layout')}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Configurações</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push('/billing')}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    <span>Assinatura</span>
                                </DropdownMenuItem>
                                {profile.is_superuser && (
                                    <DropdownMenuItem onClick={() => router.push('/admin')} className="text-destructive focus:text-destructive">
                                        <Shield className="mr-2 h-4 w-4" />
                                        <span>Painel Admin</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button size="sm" onClick={() => router.push('/auth/login')} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                            Entrar
                        </Button>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Navigation (Tab Bar) - Compact */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-xl border-t border-border/50 z-50 px-1 py-1 flex justify-around items-center h-16 shadow-[0_-1px_15px_rgba(0,0,0,0.05)]">
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => router.push(item.path)}
                        className={cn(
                            "flex flex-col items-center justify-center w-full py-0.5 gap-0.5 transition-colors text-muted-foreground",
                            pathname === item.path ? "text-emerald-600" : "hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn("w-5 h-5", pathname === item.path ? "stroke-[2.5px]" : "stroke-[2px]")} />
                        <span className="text-[9px] font-bold uppercase tracking-tight leading-none">{item.label}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
