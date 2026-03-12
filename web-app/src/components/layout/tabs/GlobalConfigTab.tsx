"use client";

import { EditorSettings } from "@/types/editor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";

interface GlobalConfigTabProps {
    settings: EditorSettings;
    onChange: (settings: EditorSettings) => void;
    onSave: () => void;
    isSaving?: boolean;
}

const FONT_FAMILIES = [
    { label: "Arial", value: "Arial" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Playfair Display", value: "Playfair Display" },
];

const FONT_WEIGHTS = [
    { label: "Normal", value: "normal" },
    { label: "Médio", value: "medium" },
    { label: "Semi-negrito", value: "semibold" },
    { label: "Negrito", value: "bold" },
];

const TEXT_ALIGNMENTS = [
    { label: "Esquerda", value: "left" },
    { label: "Centro", value: "center" },
    { label: "Direita", value: "right" },
];

export function GlobalConfigTab({
    settings,
    onChange,
    onSave,
    isSaving,
}: GlobalConfigTabProps) {
    const handleUpdate = (key: keyof EditorSettings, value: string | number) => {
        onChange({ ...settings, [key]: value });
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-6">
            <div>
                <h2 className="font-semibold text-foreground">Configurações Padrão</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Define o estilo inicial para novos modelos e blocos.
                </p>
            </div>

            <div className="space-y-4">
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Cores do Canvas
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="bg-color" className="text-xs">Fundo</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="bg-color"
                                    type="color"
                                    className="w-10 h-8 p-1 bg-transparent border-border"
                                    value={settings.backgroundColor}
                                    onChange={(e) => handleUpdate("backgroundColor", e.target.value)}
                                />
                                <Input
                                    type="text"
                                    className="h-8 text-[11px] uppercase"
                                    value={settings.backgroundColor}
                                    onChange={(e) => handleUpdate("backgroundColor", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="font-color" className="text-xs">Texto</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="font-color"
                                    type="color"
                                    className="w-10 h-8 p-1 bg-transparent border-border"
                                    value={settings.fontColor}
                                    onChange={(e) => handleUpdate("fontColor", e.target.value)}
                                />
                                <Input
                                    type="text"
                                    className="h-8 text-[11px] uppercase"
                                    value={settings.fontColor}
                                    onChange={(e) => handleUpdate("fontColor", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <Separator className="bg-border/50" />

                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Tipografia Padrão
                    </h3>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Família da Fonte</Label>
                        <Select
                            value={settings.fontFamily}
                            onValueChange={(v) => handleUpdate("fontFamily", v)}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_FAMILIES.map((f) => (
                                    <SelectItem key={f.value} value={f.value} className="text-xs">
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Tamanho</Label>
                            <Input
                                type="number"
                                className="h-8 text-xs font-mono"
                                value={settings.fontSize}
                                onChange={(e) => handleUpdate("fontSize", parseInt(e.target.value) || 16)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Peso</Label>
                            <Select
                                value={settings.fontWeight}
                                onValueChange={(v) => handleUpdate("fontWeight", v)}
                            >
                                <SelectTrigger className="h-8 text-xs text-left">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_WEIGHTS.map((w) => (
                                        <SelectItem key={w.value} value={w.value} className="text-xs">
                                            {w.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Alinhamento</Label>
                        <Select
                            value={settings.textAlign}
                            onValueChange={(v) => handleUpdate("textAlign", v)}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TEXT_ALIGNMENTS.map((a) => (
                                    <SelectItem key={a.value} value={a.value} className="text-xs">
                                        {a.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </section>
            </div>

            <div className="mt-auto pt-6">
                <Button
                    className="w-full gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Salvando..." : "Salvar Configurações"}
                </Button>
            </div>
        </div>
    );
}
