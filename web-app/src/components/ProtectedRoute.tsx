"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const publicRoutes = ["/auth/login", "/auth/register"];
            const token = localStorage.getItem("token");
            const isValidTokenString = token && token !== "null" && token !== "undefined";

            if (!isValidTokenString) {
                if (!publicRoutes.includes(pathname)) {
                    router.replace("/auth/login");
                } else {
                    setIsAuthorized(true);
                }
                return;
            }

            // Para rotas públicas tentar não validar caso já esteja na tela de login
            if (publicRoutes.includes(pathname)) {
                setIsAuthorized(true);
                return;
            }

            try {
                // Tenta validar o token batendo no backend
                await api.get("/auth/me");
                setIsAuthorized(true);
            } catch (error: any) {
                // Se der erro (401, 403, etc), significa que o token é inválido
                localStorage.removeItem("token");
                router.replace("/auth/login");
            }
        };

        checkAuth();
    }, [pathname, router]);

    // Exibe um loader minimalista enquanto certifica se pode autorizar
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return <>{children}</>;
}
