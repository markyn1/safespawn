// ── Enums ──────────────────────────────────────────────

export enum TemplateOwner {
    FeedReady = "feedready",
    Personal  = "personal",
    Community = "community",
}

export type BlockType =
    | "text"
    | "image"
    | "video"
    | "shape"
    | "logo"
    | "text_ia"
    | "image_ia";

// ── Brand Kit ──────────────────────────────────────────

export interface BrandKitVariables {
    nome:   string;
    slogan: string;
    email:  string;
    site:   string;
    [key: string]: string; // variáveis customizadas do usuário
}

export interface BrandKit {
    id:          number;
    name:        string;
    description: string;
    logo:        string;
    colors:      string[];
    fonts:       string[];
    variables:   BrandKitVariables;
}

// ── Editor (config padrão) ────────────────────────────

export interface EditorSettings {
    backgroundColor: string;
    fontColor:       string;
    fontFamily:      string;
    fontSize:        number;
    fontWeight:      string;
    textAlign:       string;
}

// ── Block ──────────────────────────────────────────────

export interface BlockStyle {
    backgroundColor?: string;
    fontColor?:       string;
    fontFamily?:      string;
    fontSize?:        number;
    fontWeight?:      string;
    textAlign?:       string;
    opacity?:         number;
    borderRadius?:    number;
}

export interface Block {
    id:      string;
    type:    BlockType;
    x:       number;
    y:       number;
    width:   number;
    height:  number;
    z_index?: number;
    rotation?: number;

    payload?: Record<string, unknown>;
    style?:   BlockStyle;

    // conexão com o kit de marca
    brand_variable?: keyof BrandKitVariables | null;

    // UX
    locked?:      boolean;
    placeholder?: string;
}

// ── Resolution ─────────────────────────────────────────

export interface ResolutionRef {
    id:      number;
    name:    string;
    label?:  string;
    width:   number;
    height:  number;
}

// ── Template ───────────────────────────────────────────

export interface Template {
    // Identidade
    id:            string;
    name:          string;
    description:   string;
    thumbnail_url: string;

    // Classificação
    owner:      TemplateOwner;
    category:   string[];
    tags:       string[];

    // Resolução (fonte da verdade: resolution_id)
    resolution_id: number;
    resolution?:   ResolutionRef;   // populado via join
    width:         number;          // snapshot — garante consistência de templates antigos
    height:        number;

    // Canvas
    background: string;
    blocks:     Block[];

    // Metadados
    created_at: string;  // ISO 8601
    created_by: string;
    version:    number;
}

// ── Design (fork do usuário) ───────────────────────────

export interface Design extends Omit<Template, "owner"> {
    owner:        TemplateOwner.Personal;
    user_id:      string;
    forked_from?: string;  // Template.id de origem, null se criado do zero
    is_draft:     boolean;
    last_edited:  string;  // ISO 8601
}