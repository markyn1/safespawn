"use client";

import { useProtectedImage } from "@/hooks/useProtectedImage";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtectedImageProps {
    src?: string;
    alt?: string;
    className?: string;
    fallback?: React.ReactNode;
}

/**
 * An <img> wrapper that securely loads protected upload images via blob URLs.
 * The JWT token never appears in any URL — it's only sent in the Authorization header.
 */
export function ProtectedImage({ src, alt = "", className, fallback }: ProtectedImageProps) {
    const resolvedSrc = useProtectedImage(src);

    if (!resolvedSrc) {
        return (
            <div className={cn("flex items-center justify-center bg-muted", className)}>
                {fallback ?? <ImageIcon className="text-muted-foreground opacity-30" size={32} />}
            </div>
        );
    }

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            draggable={false}
        />
    );
}
