import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AestheticsTabProps {
    layoutColors: any;
    setLayoutColors: React.Dispatch<React.SetStateAction<any>>;
    availableFonts: any[];
}

export const AestheticsTab: React.FC<AestheticsTabProps> = ({
    layoutColors, setLayoutColors, availableFonts
}) => {
    return (
        <div className="p-4 space-y-6">
            <section className="space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Identidade Visual</h3>
                <Card className="border-border/50 shadow-none bg-muted/10">
                    <CardContent className="p-4 space-y-4">
                        {([
                            { key: "title_color", label: "Principal" },
                            { key: "subtitle_color", label: "Secundário" },
                            { key: "accent_color", label: "Acento" },
                            { key: "background_color", label: "Background" },
                        ] as const).map(({ key, label }) => (
                            <div key={key} className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">{label}</label>
                                    <span className="text-[10px] font-mono uppercase text-emerald-600 font-bold">{layoutColors[key]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={layoutColors[key]}
                                        onChange={e => setLayoutColors((prev: any) => ({ ...prev, [key]: e.target.value }))}
                                        className="w-8 h-8 cursor-pointer rounded-lg border border-border/50"
                                    />
                                    <Input
                                        type="text"
                                        value={layoutColors[key]}
                                        onChange={e => setLayoutColors((prev: any) => ({ ...prev, [key]: e.target.value }))}
                                        className="h-8 font-mono text-[11px] uppercase border-border/50"
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <section className="space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tipografia Base</h3>
                <Card className="border-border/50 shadow-none bg-muted/10">
                    <CardContent className="p-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Fonte Padrão do Perfil</label>
                            <Select
                                value={layoutColors.font_bold || '__none__'}
                                onValueChange={val => setLayoutColors((prev: any) => ({ ...prev, font_bold: val === '__none__' ? '' : val }))}
                            >
                                <SelectTrigger className="w-full h-9 bg-background border-border/50 text-[11px] font-bold">
                                    <SelectValue placeholder="Selecione uma fonte..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__" className="text-xs text-muted-foreground">Nenhuma (usar padrão do sistema)</SelectItem>
                                    {availableFonts.map(f => (
                                        <SelectItem key={f.id} value={f.id} className="text-xs font-medium">
                                            {f.name.replace(/\.[^.]+$/, '')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};
