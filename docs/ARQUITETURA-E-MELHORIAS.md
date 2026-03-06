# Arquitetura do Projeto Content Creator

## Visão geral

O projeto é um **monorepo** com:
- **Backend**: API REST em **FastAPI** (Python), porta 8000
- **Frontend**: aplicação **Next.js** (React) em `web-app/`
- **Banco de dados**: **MySQL** (SQLAlchemy assíncrono)
- **Processamento**: fila in-memory (`asyncio.Queue`) + worker para geração de conteúdo (vídeo/arte)

---

## Estrutura de pastas (resumida)

```
CONTENT CREATOR/
├── api/                    # Backend FastAPI
│   ├── main.py              # App, CORS, roteamento, lifespan
│   ├── core/                # DB, queue, security
│   ├── models/              # SQLAlchemy (User, SocialProfile, Generation, etc.)
│   ├── routes/              # Rotas por domínio (auth, generation, settings, ...)
│   ├── services/            # Lógica de negócio (GenerationService, pipeline)
│   ├── repositories/        # Acesso a dados (GenerationRepository)
│   └── schemas/             # Pydantic (request/response)
├── core/                    # Engines de negócio (AI, copy, design, export)
├── web-app/                 # Frontend Next.js
│   └── src/
│       ├── app/             # Páginas (dashboard, settings, auth, admin)
│       ├── components/       # UI e componentes de domínio
│       ├── hooks/            # useLayout, useSettings (estado + chamadas API)
│       └── lib/api.ts       # Cliente HTTP (axios) + interceptors
├── designs/                 # Templates visuais e assets
├── input/                   # Arquivos enviados para processamento
└── output/                  # Vídeos/artes gerados
```

---

## Como a comunicação com o backend funciona

### 1. Cliente HTTP no frontend

- **Arquivo**: `web-app/src/lib/api.ts`
- **Biblioteca**: `axios` com `baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'`
- **Autenticação**: interceptor de request lê `localStorage.getItem('token')` e envia `Authorization: Bearer <token>`
- **Tratamento de 401**: interceptor de response remove o token e redireciona para `/auth/login` em caso de não autorizado

Todas as chamadas partem desse cliente, então a base já é `/api` (ex.: `api.get('/auth/me')` → `GET http://localhost:8000/api/auth/me`).

### 2. Fluxo de autenticação

1. **Login**: `POST /api/auth/login` (form: username, password) → retorna `{ access_token, token_type: "bearer" }`
2. Frontend guarda o token em `localStorage` e usa em todas as requisições via interceptor
3. **Verificação**: `GET /api/auth/me` (com Bearer) → usado para proteger rotas e obter dados do usuário
4. Rotas protegidas no backend usam `get_current_user` (OAuth2PasswordBearer + JWT)

### 3. Principais grupos de rotas (backend)

| Prefixo | Descrição |
|--------|-----------|
| `/api/auth` | Login, registro, `/me` |
| `/api/generate` | URL/upload, status, histórico, retry, favoritos, export |
| `/api/social-profiles` | CRUD perfis por nome/id, avatar, variáveis |
| `/api/settings` | Formatos, fontes, perfis de layout, background |
| `/api/user` | Variáveis globais do usuário |
| `/api/prompt-templates` | Biblioteca de prompts |
| `/api/design_styles` | Estilos de design |
| `/api/designs_manager` | Temas, estrutura, prompts, upload (prefix completo no router) |
| `/api/admin` | Usuários, planos, defaults |
| `/api/output`, `/api/designs` | Arquivos estáticos (mount) |

### 4. Fluxo de uma geração (exemplo)

1. Frontend: `POST /api/generate/url` ou `POST /api/generate/upload` (token + body/form).
2. **GenerationService** valida limites do usuário, cria registro `Generation` (status PENDING), monta payload e coloca na **fila** (`generation_queue`).
3. Resposta imediata com o objeto da geração (id, status PENDING).
4. Um **worker** em background (`process_queue_worker`) consome a fila, chama o **pipeline** (download → AI → copy → layout → design → export) e atualiza o mesmo registro (COMPLETED/ERROR).
5. Frontend pode polling em `GET /api/generate/status/{id}` ou listar `GET /api/generate/history`.

### 5. Pontos de atenção na comunicação

- **URLs hardcoded**: em vários pontos o frontend usa `http://localhost:8000` direto (ex.: imagens em `dashboard`, `designs`, `settings`). O ideal é usar uma base configurável (ex.: `NEXT_PUBLIC_API_URL`) para não quebrar em outros ambientes.
- **designs_manager**: algumas telas usam `fetch('http://localhost:8000/api/designs_manager/...')` em vez do `api` (axios), então não enviam o token automaticamente. Se essas rotas forem protegidas, pode dar 401.
- **Consistência**: parte das rotas usa `api` (axios), parte usa `fetch`; padronizar no cliente `api` e numa única base de URL melhora manutenção e segurança.

---

## Sugestões de melhoria

### 1. Base URL e arquivos estáticos no frontend

- **Problema**: URLs como `http://localhost:8000/api/output/...` e `http://localhost:8000/api/designs/...` estão espalhadas no código.
- **Sugestão**: Criar um helper no frontend, por exemplo:
  - `getApiBaseUrl()` → `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`
  - `getOutputUrl(path)`, `getDesignsUrl(path)` que montam `getApiBaseUrl() + '/api/output/' + ...`
- Usar esse helper em todos os lugares que montam URL de mídia/designs para facilitar deploy (staging/produção).

### 2. Centralizar chamadas ao backend (designs_manager e outras)

- **Problema**: `designs/page.tsx` e outros usam `fetch('http://localhost:8000/api/designs_manager/...')` sem passar o token.
- **Sugestão**: Usar o mesmo `api` (axios) de `lib/api.ts` para **todas** as chamadas à API (incluindo designs_manager), para garantir envio do token e comportamento único em 401 (logout + redirect).

### 3. Camada de serviços/hooks de API no frontend

- **Problema**: Lógica de chamadas (get, post, put, delete) e tratamento de erro está espalhada em páginas e hooks (useLayout, useSettings, dashboard).
- **Sugestão**: Criar módulos por domínio, por exemplo:
  - `api/socialProfiles.ts`: `getProfiles()`, `getProfileByName(name)`, `updateProfile(name, data)`, etc.
  - `api/generation.ts`: `generateFromUrl(url, ...)`, `getHistory()`, `getStatus(id)`, etc.
  - `api/settings.ts`: `getFormats()`, `getFormatProfiles(format)`, etc.
- Os hooks/páginas passam a chamar apenas essas funções; fica mais fácil trocar implementação, adicionar cache (ex.: React Query) e tratar erros em um só lugar.

### 4. Tratamento de erros e feedback

- **Problema**: Muitos `catch` apenas fazem `toast.error` ou log; o usuário nem sempre sabe se foi 422, 404 ou erro de rede.
- **Sugestão**: No interceptor do axios (ou na camada de serviços), mapear status (400, 404, 422, 500) e mensagens do backend para mensagens amigáveis; opcionalmente expor um estado global de “último erro” para a UI mostrar em um canto (banner/toast) de forma consistente.

### 5. Variáveis de ambiente

- **Backend**: Já usa `DB_*`, etc. Vale documentar no README ou em `.env.example` todas as variáveis usadas (incluindo JWT/secret).
- **Frontend**: Garantir que `NEXT_PUBLIC_API_URL` esteja documentada e usada em todos os pontos que precisam da base da API (não só no axios, mas também nos helpers de URL de mídia).

### 6. Documentação da API

- **Sugestão**: O FastAPI já expõe `/docs` (Swagger). Manter schemas Pydantic consistentes e, se possível, descrever em cada rota um `summary` e `response_description` para facilitar integração e onboarding.

### 7. Fila de geração e resiliência

- **Atual**: Fila em memória (`asyncio.Queue`). Se o processo morrer, as tarefas pendentes se perdem.
- **Sugestão (quando escalar)**: Migrar para uma fila persistente (Redis, Celery, ou mesmo uma tabela “jobs” no MySQL com worker polling) para retries e auditoria.

### 8. Testes

- **Backend**: Testes de rotas (TestClient do FastAPI) para auth, social-profiles e generate (ex.: criar geração e checar status).
- **Frontend**: Testes de integração ou E2E para fluxos críticos (login → dashboard → uma geração) garantem que a comunicação com o backend continua funcionando após refators.

---

## Resumo

- **Arquitetura**: Frontend Next.js consome API FastAPI via axios (`lib/api.ts`), com JWT no `localStorage` e interceptors para auth e 401.
- **Backend**: Organizado em rotas, serviços, repositórios e models; geração assíncrona via fila in-memory e pipeline em `core/`.
- **Melhorias prioritárias**: (1) base URL configurável e helpers para mídia no frontend, (2) usar o mesmo cliente `api` em todas as chamadas (incluindo designs_manager), (3) camada de serviços de API no frontend e (4) tratamento de erros e uso consistente de `NEXT_PUBLIC_API_URL`.
