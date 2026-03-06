"use client"
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push('/auth/login');
            return;
        }

        api.post('/auth/verify', {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).then((res: any) => {
            if (res.data.success) {
                router.push('/dashboard');
            } else {
                router.push('/auth/login');
            }
        }).catch(() => {
            router.push('/auth/login');
        });
    }, [router]);

    return null; // Evita flash de conteúdo vazio
}
