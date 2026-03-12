// ── Enums ──────────────────────────────────────────────

export enum TemplateOwner {
    FeedReady = "feedready",
    Personal = "personal",
    Community = "community",
}

export type BlockType =
    | "text"
    | "image"
    | "video"
    | "shape"
    | "logo"
    | "text_ia"
    | "image_ia"
    | "caption_ia"  // AI-generated post description — invisible on canvas
    | "media_slot"; // Main content placeholder — source filled at processing time

// ── Brand Kit ──────────────────────────────────────────

export interface BrandKitVariables {
    nome: string;
    slogan: string;
    email: string;
    site: string;
    [key: string]: string; // variáveis customizadas do usuário
}

export interface BrandKit {
    id: number;
    name: string;
    description: string;
    logo: string;
    colors: string[];
    fonts: string[];
    variables: BrandKitVariables;
}

// ── Editor (config padrão) ────────────────────────────

export interface EditorSettings {
    backgroundColor: string;
    fontColor: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    textAlign: string;
}

// ── Block ──────────────────────────────────────────────

export interface BlockStyle {
    backgroundColor?: string;
    fontColor?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    opacity?: number;
    borderRadius?: number;
}

export interface BaseBlock {
    id: string;
    title: string;
    variableName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z_index?: number;
    rotation?: number;
    renderized?: boolean;

    style?: BlockStyle;

    // conexão com o kit de marca
    brand_variable?: keyof BrandKitVariables | null;

    // UX
    locked?: boolean;
    placeholder?: string;
}

export interface TextBlock extends BaseBlock {
    type: "text";
    payload: {
        content?: string;
        fontSize?: number;
        fontColor?: string;
        fontWeight?: string;
        fontFamily?: string;
    };
}

export interface AITextBlock extends Omit<TextBlock, "type" | "payload"> {
    type: "text_ia";
    payload: {
        content?: string;           // AI-generated result
        prompt?: string;            // full resolved prompt body (with @{} tokens)
        promptId?: string;          // source prompt id (for traceability)
        variableBindings?: Record<string, string>; // token name → block variableName
        fontSize?: number;
        fontColor?: string;
        fontWeight?: string;
        fontFamily?: string;
    };
}

/**
 * CaptionIABlock — Invisible on canvas.
 * Used as the AI-generated description / caption of the social media post.
 * Rendered only in the output metadata, not in the visual template.
 */
export interface CaptionIABlock extends BaseBlock {
    type: "caption_ia";
    payload: {
        content?: string;           // AI-generated caption (final result)
        prompt?: string;            // resolved prompt body
        promptId?: string;
        variableBindings?: Record<string, string>;
    };
}

export interface ImageBlock extends BaseBlock {
    type: "image";
    payload: {
        src?: string;
        alt?: string;
    };
}

export interface AIImageBlock extends Omit<ImageBlock, "type" | "payload"> {
    type: "image_ia";
    payload: {
        src?: string;
        alt?: string;
        prompt?: string;
    };
}

export interface VideoBlock extends BaseBlock {
    type: "video";
    payload: {
        src?: string;          // URL or /api/uploads/... path
        loop?: boolean;        // loop the video (default true)
        muted?: boolean;       // muted by default (required for autoplay)
        objectFit?: "cover" | "contain" | "fill";
    };
}

export interface ShapeBlock extends BaseBlock {
    type: "shape";
    payload: {
        shapeType?: "rectangle" | "circle" | "triangle" | string;
    };
}

export interface LogoBlock extends Omit<ImageBlock, "type"> {
    type: "logo";
}

/**
 * MediaSlotBlock — the main content placeholder.
 * Defines only position & size in the template.
 * The actual media (video or image) is injected at processing/render time.
 * Has no editable content properties.
 */
export interface MediaSlotBlock extends BaseBlock {
    type: "media_slot";
    payload: Record<string, never>; // intentionally empty — filled at runtime
}

export type Block =
    | TextBlock
    | AITextBlock
    | CaptionIABlock
    | ImageBlock
    | AIImageBlock
    | VideoBlock
    | ShapeBlock
    | LogoBlock
    | MediaSlotBlock;


// ── Resolution ─────────────────────────────────────────

export interface ResolutionRef {
    id: number;
    name: string;
    label?: string;
    width: number;
    height: number;
}

// ── Template ───────────────────────────────────────────

export interface Template {
    // Identidade
    id: string;
    name: string;
    description: string;
    thumbnail_url: string;

    // Classificação
    owner: TemplateOwner;
    category: string[];
    tags: string[];

    // Resolução (fonte da verdade: resolution_id)
    resolution_id: number;
    resolution?: ResolutionRef;   // populado via join
    width: number;          // snapshot — garante consistência de templates antigos
    height: number;

    // Canvas
    background: string;
    blocks: Block[];

    // Metadados
    created_at: string;  // ISO 8601
    created_by: string;
    version: number;
}

// ── Design (fork do usuário) ───────────────────────────

export interface Design extends Omit<Template, "owner"> {
    owner: TemplateOwner.Personal;
    user_id: string;
    forked_from?: string;  // Template.id de origem, null se criado do zero
    is_draft: boolean;
    last_edited: string;  // ISO 8601
}