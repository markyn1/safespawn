import { useState, useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Securely loads a protected image URL by fetching it via axios
 * (which sends the Authorization header — token NEVER appears in any URL).
 *
 * Returns a local Blob URL safe to use in <img src={...}>.
 * The blob URL is revoked on cleanup to prevent memory leaks.
 *
 * For non-upload URLs (external images), the original URL is returned as-is.
 */
export function useProtectedImage(url: string | undefined): string | undefined {
    const [blobUrl, setBlobUrl] = useState<string | undefined>(url);

    useEffect(() => {
        // Only intercept our own protected upload URLs — leave external URLs alone
        if (!url || !url.includes("/api/uploads/")) {
            setBlobUrl(url);
            return;
        }

        let objectUrl: string | undefined;
        let cancelled = false;

        (async () => {
            try {
                const res = await api.get(url, {
                    responseType: "blob",
                    // Override baseURL so the full URL is used as-is
                    baseURL: "",
                });
                if (!cancelled) {
                    objectUrl = URL.createObjectURL(res.data);
                    setBlobUrl(objectUrl);
                }
            } catch {
                // On auth error or 404 — show nothing
                if (!cancelled) setBlobUrl(undefined);
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url]);

    return blobUrl;
}
