import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Feed Ready | Automatização de Conteúdo',
    description: 'Gere conteúdos artísticos através de automação e IA.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Toaster position="bottom-right" />
                    <ProtectedRoute>
                        <Navbar />
                        {children}
                    </ProtectedRoute>
                </ThemeProvider>
            </body>
        </html>
    )
}
