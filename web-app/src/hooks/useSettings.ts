import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";

export type BlockType = 'text' | 'image' | 'media';

export interface BlockData {
    id: string;
    type: BlockType;
    subtype?: 'dynamic' | 'static';
    label: string;
    description?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    zIndex: number;
    visible: boolean;
    locked?: boolean;

    // Text specific
    value?: string;
    fontSize?: number;
    fontFamily?: string;
    fontColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    letterSpacing?: number;
    aiEnabled?: boolean;
    promptTemplateId?: number | null;

    // Image specific
    src?: string;
    opacity?: number;

    // Media specific
    scale_mode?: 'fit' | 'fill';

    // Legacy compatibility (to be removed after refactor)
    color?: string;
    promptOverride?: string;
    z_index?: number;
    font?: string;
    font_size?: number;
}

export function useSettings(initialFormat: string = "instagram43") {
    const [formatName, setFormatName] = useState(initialFormat);
    const [activeTab, setActiveTab] = useState<'profile' | 'topography' | 'aesthetics' | 'promptlib'>('topography');
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [availableFonts, setAvailableFonts] = useState<any[]>([]);
    const [blocks, setBlocks] = useState<BlockData[]>([]);
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [canvasW, setCanvasW] = useState(1080);
    const [canvasH, setCanvasH] = useState(1350);
    const [loading, setLoading] = useState(true);
    const [isUploadingBg, setIsUploadingBg] = useState(false);
    const [useTemplate, setUseTemplate] = useState<boolean>(false);
    const [currentTemplatePath, setCurrentTemplatePath] = useState<string | undefined>(undefined);

    // Identidades e Perfis
    const [profileName, setProfileName] = useState("default");
    const [availableProfiles, setAvailableProfiles] = useState<string[]>(["default"]);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [profileIdentity, setProfileIdentity] = useState({
        display_name: "",
        username: "",
        contact: "",
        genre: "",
        custom_vars: {} as Record<string, string>,
    });

    // Prompts
    const [promptTemplates, setPromptTemplates] = useState<any[]>([]);
    const [isSimulatingIA, setIsSimulatingIA] = useState(false);

    // Layout Colors
    const [layoutColors, setLayoutColors] = useState({
        title_color: "#FFFFFF",
        subtitle_color: "#CCCCCC",
        accent_color: "#FFD700",
        background_color: "#0E0E0E",
        font_bold: "designs/default/fonts/Ubuntu-Light.ttf",
    });

    useEffect(() => {
        fetchFormatConfig();
        fetchProfiles();
        fetchProfileIdentity();
        fetchPromptTemplates();
        fetchFonts();
        checkSuperuser();
    }, [formatName]);

    useEffect(() => {
        fetchFormatConfig();
        fetchProfileIdentity();
    }, [profileName]);

    const fetchFonts = async () => {
        try {
            const res = await api.get("/settings/fonts");
            if (res.data?.fonts) setAvailableFonts(res.data.fonts);
        } catch (err) { }
    };

    const checkSuperuser = async () => {
        try {
            const res = await api.get("/auth/me");
            setIsSuperuser(!!res.data.is_superuser);
        } catch (err) { }
    };

    const fetchFormatConfig = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/settings/formats/${formatName}/profiles/${encodeURIComponent(profileName)}`);
            const config = res.data.config;

            // Fix: Backend uses [width, height] array, hook was looking for properties
            if (Array.isArray(config.resolution)) {
                setCanvasW(config.resolution[0]);
                setCanvasH(config.resolution[1]);
            } else {
                setCanvasW(config.width || 1080);
                setCanvasH(config.height || 1350);
            }
            setUseTemplate(!!config.use_template);
            setCurrentTemplatePath(config.template_path);

            if (config.bg_image) {
                setBgImage(`http://localhost:8000/api/${config.bg_image}`);
            }

            setLayoutColors({
                title_color: config.title_color || "#FFFFFF",
                subtitle_color: config.subtitle_color || "#FFFFFF",
                accent_color: config.accent_color || "#FFD700",
                background_color: config.background_color || "#0E0E0E",
                font_bold: config.font_bold || "designs/default/fonts/Ubuntu-Light.ttf",
            });

            const adapted = adaptLegacyToBlocks(config);
            setBlocks(adapted);
        } catch (error) {
            toast.error("Erro ao carregar formato.");
        } finally {
            setLoading(false);
        }
    };

    const adaptLegacyToBlocks = (config: any): BlockData[] => {
        const result: BlockData[] = [];
        let zPos = 10;

        if (config.media_area) {
            result.push({
                id: 'media_area', type: 'media', label: 'Mídia Original',
                x: config.media_area[0], y: config.media_area[1], w: config.media_area[2], h: config.media_area[3],
                zIndex: config.media_z_index || 5,
                visible: true, scale_mode: 'fill'
            });
        }

        ['title', 'subtitle', 'hook'].forEach(name => {
            const areaKey = `${name}_area`;
            if (config[areaKey]) {
                const area = config[areaKey];
                result.push({
                    id: areaKey, type: 'text', subtype: 'dynamic',
                    label: name.charAt(0).toUpperCase() + name.slice(1),
                    x: area[0], y: area[1], w: area[2], h: area[3],
                    zIndex: config[`${name}_z_index`] || zPos++,
                    visible: true,
                    fontSize: config[`${name}_font_size`] || 40,
                    fontFamily: config[`${name}_font`] || "",
                    fontColor: config[`${name}_color`] || "#FFFFFF",
                    aiEnabled: config[`${name}_ai_enabled`] !== false,
                    promptTemplateId: config[`${name}_prompt_template_id`] || null,
                    color: "rgba(16, 185, 129, 0.3)"
                });
            }
        });

        // Extra dynamic areas
        Object.entries(config).forEach(([key, val]: [string, any]) => {
            if (key.startsWith('extra_area_') && Array.isArray(val)) {
                const label = config[`${key}_label`] || 'Área Extra';
                const prefix = key.replace('_area', '');
                result.push({
                    id: key, type: 'text', subtype: 'dynamic', label,
                    x: val[0], y: val[1], w: val[2], h: val[3],
                    zIndex: config[`${prefix}_z_index`] || zPos++,
                    visible: true,
                    fontSize: config[`${prefix}_font_size`] || 40,
                    fontFamily: config[`${prefix}_font`] || "",
                    fontColor: config[`${prefix}_color`] || "#FFFFFF",
                    aiEnabled: config[`${prefix}_ai_enabled`] !== false,
                    promptTemplateId: config[`${prefix}_prompt_template_id`] || null,
                    color: "rgba(16, 185, 129, 0.3)"
                });
            }
        });

        if (Array.isArray(config.static_elements)) {
            config.static_elements.forEach((el: any, idx: number) => {
                let sanitizedSrc = el.src;
                if (el.type === "image" && el.src && el.src.includes('designs')) {
                    const parts = el.src.split(/[/\\]designs[/\\]/);
                    sanitizedSrc = parts.length > 1 ? parts[1].replace(/\\/g, '/') : el.src;
                }
                result.push({
                    id: `static-${idx}`, type: el.type === 'text' ? 'text' : 'image',
                    subtype: 'static', label: el.type === 'text' ? 'Texto Fixo' : 'Imagem Fixa',
                    x: el.x, y: el.y, w: el.w, h: el.h,
                    zIndex: el.z_index || zPos++,
                    visible: el.visible !== false,
                    value: el.value, fontSize: el.font_size, fontFamily: el.font, fontColor: el.color,
                    src: sanitizedSrc, opacity: el.opacity || 1
                });
            });
        }
        return result.sort((a, b) => a.zIndex - b.zIndex);
    };

    const buildConfigData = () => {
        const configData: any = {
            ...layoutColors,
            resolution: [canvasW, canvasH],
            template_path: currentTemplatePath,
            use_template: useTemplate
        };

        configData.static_elements = blocks
            .filter(b => b.subtype === 'static')
            .map(b => ({
                id: b.id, type: b.type === 'image' ? 'image' : 'text',
                x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h),
                z_index: b.zIndex, visible: b.visible, value: b.value, src: b.src,
                font: b.fontFamily, font_size: b.fontSize, color: b.fontColor, opacity: b.opacity
            }));

        blocks.filter(b => b.subtype === 'dynamic' || b.type === 'media').forEach(b => {
            const textType = b.id.replace('_area', '');
            configData[b.id] = [Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)];

            if (b.type === 'media') {
                if (b.zIndex !== undefined) configData.media_z_index = b.zIndex;
            } else {
                if (b.zIndex !== undefined) configData[`${textType}_z_index`] = b.zIndex;
                if (b.fontSize !== undefined) configData[`${textType}_font_size`] = b.fontSize;
                if (b.fontFamily !== undefined) configData[`${textType}_font`] = b.fontFamily;
                if (b.fontColor) configData[`${textType}_color`] = b.fontColor;
                if (b.aiEnabled !== undefined) configData[`${textType}_ai_enabled`] = b.aiEnabled;
                if (b.promptTemplateId !== undefined) configData[`${textType}_prompt_template_id`] = b.promptTemplateId;
                if (b.promptOverride !== undefined) configData[`${textType}_prompt_override`] = b.promptOverride;
            }
        });

        configData.blocks = blocks;
        return configData;
    };

    const saveConfig = async () => {
        const configData = buildConfigData();
        let profileToSave = profileName;

        if (profileName === "default" && !isSuperuser) {
            let newName = "Cópia do padrão";
            let i = 1;
            const existing = availableProfiles || [];
            while (existing.some((p: string) => p.toLowerCase() === newName.toLowerCase())) {
                newName = `Cópia do padrão ${i}`;
                i++;
            }
            try {
                const createRes = await api.post(`/settings/formats/${formatName}/profiles`, {
                    new_name: newName,
                    source_profile: "default",
                });
                const createdName = createRes.data?.profile_name || newName;
                profileToSave = createdName;
                setProfileName(createdName);
                await fetchProfiles();
            } catch (err: any) {
                const msg = err.response?.data?.detail || err.message || "Erro ao criar novo perfil.";
                toast.error(typeof msg === "string" ? msg : "Erro ao criar novo perfil. Tente outro nome.");
                return false;
            }
        }

        try {
            await api.put(`/settings/formats/${formatName}/profiles/${encodeURIComponent(profileToSave)}`, configData);
            toast.success(profileToSave !== profileName ? `Layout salvo no novo perfil "${profileToSave}".` : `Perfil "${profileName}" salvo!`);
            if (profileToSave !== profileName) fetchProfiles();
            return true;
        } catch (error) {
            toast.error("Erro ao salvar layout.");
            return false;
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await api.get(`/settings/formats/${formatName}/profiles`);
            setAvailableProfiles(res.data.profiles || ["default"]);
        } catch (err) { }
    };

    const fetchProfileIdentity = async () => {
        try {
            const res = await api.get(`/profiles/${encodeURIComponent(profileName)}`);
            setProfileIdentity({
                display_name: res.data.display_name || "",
                username: res.data.username || "",
                contact: res.data.contact || "",
                genre: res.data.genre || "",
                custom_vars: res.data.custom_vars || {},
            });
        } catch (err) { }
    };

    const fetchPromptTemplates = async () => {
        try {
            const res = await api.get(`/prompt-templates`);
            setPromptTemplates(res.data);
        } catch { }
    };

    const simulateAI = async () => {
        setIsSimulatingIA(true);
        try {
            const res = await api.post(`/generate/test-prompts`, {
                blocks,
                profile_vars: profileIdentity,
                config_data: { format_name: formatName }
            });
            const results = res.data;
            setBlocks(prev => prev.map(b => {
                const val = results[b.label];
                return val !== undefined ? { ...b, value: val } : b;
            }));
            toast.success("Simulação concluída!");
        } catch {
            toast.error("Erro na simulação.");
        } finally {
            setIsSimulatingIA(false);
        }
    };

    return {
        formatName, setFormatName,
        activeTab, setActiveTab,
        activeElementId, setActiveElementId,
        availableFonts, setAvailableFonts,
        blocks, setBlocks,
        bgImage, setBgImage,
        canvasW, setCanvasW,
        canvasH, setCanvasH,
        loading, setLoading,
        isUploadingBg, setIsUploadingBg,
        useTemplate, setUseTemplate,
        currentTemplatePath, setCurrentTemplatePath,
        profileName, setProfileName,
        availableProfiles, setAvailableProfiles,
        profileIdentity, setProfileIdentity,
        promptTemplates, setPromptTemplates,
        layoutColors, setLayoutColors,
        isSimulatingIA, setIsSimulatingIA,
        isSuperuser,
        saveConfig,
        simulateAI,
        fetchFormatConfig,
        fetchProfiles,
        fetchProfileIdentity,
        fetchPromptTemplates,
        buildConfigData
    };
}
