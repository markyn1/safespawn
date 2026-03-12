"use client";

import { useState } from "react";
import { Bug, ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebugPanelProps {
    project: any;
}

function JsonTree({ data, depth = 0 }: { data: any; depth?: number }) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const toggle = (key: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    if (data === null) return <span className="text-zinc-500">null</span>;
    if (data === undefined) return <span className="text-zinc-500">undefined</span>;
    if (typeof data === "boolean") return <span className="text-amber-400">{String(data)}</span>;
    if (typeof data === "number") return <span className="text-cyan-400">{data}</span>;
    if (typeof data === "string") return <span className="text-emerald-400">"{data}"</span>;

    if (Array.isArray(data)) {
        const key = `arr-${depth}`;
        const isCollapsed = collapsed.has(key);
        if (data.length === 0) return <span className="text-zinc-500">[]</span>;
        return (
            <span>
                <button onClick={() => toggle(key)} className="inline-flex items-center text-zinc-400 hover:text-white">
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span className="text-zinc-500">[{data.length}]</span>
                </button>
                {!isCollapsed && (
                    <div className="ml-3 border-l border-zinc-700 pl-2 mt-0.5">
                        {data.map((item, i) => (
                            <div key={i} className="flex gap-1">
                                <span className="text-zinc-600 shrink-0 text-[10px] pt-0.5">{i}</span>
                                <JsonTree data={item} depth={depth + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </span>
        );
    }

    if (typeof data === "object") {
        const entries = Object.entries(data);
        const key = `obj-${depth}-${entries.map(([k]) => k).join("")}`;
        const isCollapsed = collapsed.has(key);
        if (entries.length === 0) return <span className="text-zinc-500">{"{}"}</span>;
        return (
            <span>
                <button onClick={() => toggle(key)} className="inline-flex items-center text-zinc-400 hover:text-white">
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span className="text-zinc-500">{"{…}"}</span>
                </button>
                {!isCollapsed && (
                    <div className="ml-3 border-l border-zinc-700 pl-2 mt-0.5">
                        {entries.map(([k, v]) => (
                            <div key={k} className="flex gap-1.5 flex-wrap">
                                <span className="text-violet-400 shrink-0">{k}:</span>
                                <JsonTree data={v} depth={depth + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </span>
        );
    }

    return <span className="text-zinc-300">{String(data)}</span>;
}

export function DebugPanel({ project }: DebugPanelProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"project">("project");

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
            {open && (
                <div className="pointer-events-auto w-[360px] max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden font-mono text-[11px] leading-relaxed">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
                        <div className="flex items-center gap-2">
                            <Bug className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-xs font-bold text-zinc-200">Debug State</span>
                            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 rounded-full">{project?.blocks?.length || 0} blocos</span>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-zinc-800 bg-zinc-900">
                        <button
                            onClick={() => setActiveTab("project")}
                            className={cn(
                                "px-4 py-1.5 text-[11px] font-semibold transition-colors",
                                activeTab === "project"
                                    ? "text-emerald-400 border-b-2 border-emerald-500"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Project State
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {activeTab === "project" && <JsonTree data={project} />}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800 bg-zinc-900/50">
                        <span className="text-zinc-600">Live · atualiza automaticamente</span>
                        <span className={cn("h-2 w-2 rounded-full animate-pulse", "bg-emerald-500")} />
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-xs font-bold transition-all",
                    open
                        ? "bg-zinc-900 border-emerald-500 text-emerald-400"
                        : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                )}
            >
                <Bug className="h-3.5 w-3.5" />
                {open ? "Fechar Debug" : "Debug"}
            </button>
        </div>
    );
}
