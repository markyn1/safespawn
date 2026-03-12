"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import type { Block } from "@/types/editor";
import { getAllVariables, getBlockVariableValue } from "@/lib/variables";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Video, Type } from "lucide-react";

export interface VariableAutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    blocks: Block[];
    value: string;
    onValueChange: (val: string) => void;
}

function getTypeIcon(type: Block["type"]) {
    if (type === "image" || type === "image_ia" || type === "logo")
        return <ImageIcon className="h-3 w-3 shrink-0" />;
    if (type === "video")
        return <Video className="h-3 w-3 shrink-0" />;
    return <Type className="h-3 w-3 shrink-0" />;
}

export function VariableAutocompleteInput({
    blocks,
    value,
    onValueChange,
    className,
    ...props
}: VariableAutocompleteInputProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter available variables
    const availableVars = useMemo(() => {
        return blocks
            .filter(b => !!b.variableName?.trim())
            .map(b => ({
                name: b.variableName!.trim(),
                value: getBlockVariableValue(b),
                blockType: b.type,
            }));
    }, [blocks]);

    // Handle input change & detection of `@{`
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onValueChange(val);

        // Detect if cursor is right after `@{...`
        const cursor = e.target.selectionStart || 0;
        const textBeforeCursor = val.substring(0, cursor);
        const match = textBeforeCursor.match(/@\{([a-zA-Z0-9_]*)$/);

        if (match) {
            setSearchQuery(match[1] || "");
            setOpen(true);
        } else {
            setOpen(false);
        }
    };

    const handleSelectVariable = (varName: string) => {
        if (!inputRef.current) return;

        const cursor = inputRef.current.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursor);
        const textAfterCursor = value.substring(cursor);

        // Find the `@{` that opened this autocomplete
        const match = textBeforeCursor.match(/@\{([a-zA-Z0-9_]*)$/);

        if (match) {
            // Replace the `@{...` part with exactly `@{varName}`
            const newBefore = textBeforeCursor.substring(0, match.index) + `@{${varName}}`;
            const newVal = newBefore + textAfterCursor;

            onValueChange(newVal);
            setOpen(false);

            // Restore focus and cursor position after React re-renders
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newBefore.length, newBefore.length);
                }
            }, 0);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {/* The Input acts as the popover anchor */}
                <div className="relative">
                    <Input
                        ref={inputRef}
                        value={value}
                        onChange={handleChange}
                        className={className}
                        {...props}
                        autoComplete="off"
                        onClick={(e) => {
                            // Close if clicking somewhere else in the input
                            const cursor = e.currentTarget.selectionStart || 0;
                            const textBeforeCursor = value.substring(0, cursor);
                            if (!textBeforeCursor.match(/@\{([a-zA-Z0-9_]*)$/)) {
                                setOpen(false);
                            }
                        }}
                    />
                </div>
            </PopoverTrigger>

            <PopoverContent
                className="w-64 p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()} // Keep focus on the Input!
            >
                <Command shouldFilter={true}>
                    {/* Hidden input to pass the search query to Command filtering */}
                    <CommandInput value={searchQuery} onValueChange={setSearchQuery} className="hidden" />
                    <CommandList>
                        <CommandEmpty className="py-2 px-4 text-xs text-muted-foreground text-center">
                            Nenhuma variável "{searchQuery}" encontrada.
                        </CommandEmpty>
                        <CommandGroup heading="Variáveis">
                            {availableVars.map(v => (
                                <CommandItem
                                    key={v.name}
                                    value={v.name}
                                    onSelect={() => handleSelectVariable(v.name)}
                                    className="flex flex-col items-start px-2 py-1.5 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="text-muted-foreground shrink-0">
                                            {getTypeIcon(v.blockType)}
                                        </span>
                                        <span className="text-xs font-mono font-semibold text-foreground truncate">
                                            @{"{" + v.name + "}"}
                                        </span>
                                    </div>
                                    {v.value && (
                                        <span className="text-[10px] text-muted-foreground truncate w-full pl-6">
                                            {v.value}
                                        </span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
