# Aba Layouts: comunicação com o backend e tipos de salvamento

Este documento explica **como a tela de Layouts (e Configurações) se comunica com o backend**, o que é carregado, o que cada tipo de salvamento envia e onde estão as confusões de lógica.

---

## 1. Dois conceitos de “perfil” (fonte da bagunça)

Na mesma tela existem **dois tipos de “perfil”** que são independentes e salvos em lugares diferentes:

| Conceito | Seletor na UI | O que é | Onde fica no backend |
|----------|----------------|---------|------------------------|
| **Perfil de layout** | Dropdown **“Layout”** (ex: default, minimal) | Configuração **visual** do formato: blocos, posições, cores, fontes, background, canvas. É “uma variante do mesmo formato”. | Tabela `user_format_configs` (por `user_id`, `format_name`, `profile_name`) |
| **Perfil social / identidade** | Dropdown **“Identidade”** (ex: default, Marcos) | Dados da **identidade** do canal: display_name, username, contact, genre, custom_vars. Usado na geração (IA, variáveis). | Tabela `social_profiles` (por `user_id`, `name`) |

- **Formato** = base de resolução/layout (ex: instagram43, reels, stories). Vem do JSON em `designs/default/formats/{format_name}.json`.
- **Perfil de layout** = “qual variante desse formato estou editando” (default ou um nome customizado).
- **Perfil social** = “qual identidade/canal usar” (só afeta variáveis e texto gerado; não afeta onde o layout é salvo).

Quando você clica em **“Salvar Layout”**, está salvando **só o perfil de layout** do formato atual. A **identidade** (aba Perfil) não é salva nesse botão.

---

## 2. O que a aba Layouts carrega (fluxo de leitura)

Tudo é controlado pelo hook **`useLayout`** (ou `useSettings` na página de Configurações). Ao abrir a tela ou trocar **Formato** ou **Perfil de layout**:

1. **GET** `/api/settings/formats/{formatName}/profiles`  
   - Lista os nomes de perfis de layout daquele formato (ex: `["default", "minimal"]`).  
   - Backend: `settings.list_profiles` → lê `user_format_configs` onde `format_name = formatName` e monta a lista (com "default" sempre primeiro).

2. **GET** `/api/settings/formats/{formatName}/profiles/{layoutProfileName}`  
   - Carrega a **config completa** daquele formato + perfil de layout.  
   - Backend: lê o JSON base do formato em disco, depois mescla com o registro em `user_format_configs` (se existir) para esse `profile_name`.  
   - O frontend recebe um `config` com: `resolution`, `title_area`, `subtitle_area`, `hook_area`, `media_area`, `static_elements`, cores, fontes, etc.

3. O hook transforma esse `config` em **blocos** (`adaptLegacyToBlocks`) e preenche:
   - `blocks`, `canvasW`, `canvasH`, `bgImage`, `layoutColors`, `useTemplate`, etc.

4. Em paralelo, ao trocar **Identidade** (perfil social):
   - **GET** `/api/social-profiles` → lista perfis sociais.
   - **GET** `/api/social-profiles/{socialProfileName}` → preenche `profileIdentity` (display_name, username, contact, genre, custom_vars). Só usado na geração e na simulação de IA.

Resumo: **Layout** = formato + perfil de layout (config visual). **Identidade** = perfil social (só variáveis para IA).

---

## 3. O que cada tipo de salvamento envia

### 3.1 Botão **“Salvar Layout”** (header da página)

- **Quem chama:** `saveConfig()` do `useLayout` / `useSettings`.
- **Rota:** **PUT** `/api/settings/formats/{formatName}/profiles/{layoutProfileName}`
- **Payload:** `buildConfigData()` — um único objeto com tudo que define o layout visual:

| Conteúdo | Exemplo / descrição |
|----------|----------------------|
| Cores e resolução | `title_color`, `subtitle_color`, `accent_color`, `background_color`, `font_bold`, `resolution: [canvasW, canvasH]` |
| Template | `template_path`, `use_template` |
| Áreas dinâmicas e mídia | `title_area`, `subtitle_area`, `hook_area`, `media_area` (arrays [x,y,w,h]), e `*_z_index`, `*_font_size`, `*_font`, `*_color`, `*_ai_enabled`, `*_prompt_template_id` |
| Elementos estáticos | `static_elements`: array de `{ type, x, y, w, h, z_index, visible, value, src, font, font_size, color, opacity }` |
| Cópia dos blocos | `blocks`: array completo de `BlockData` (redundante com o que já está nas chaves acima; o backend pode ignorar) |

Ou seja: **um único PUT** salva toda a configuração daquele **formato + perfil de layout** (incluindo o que foi editado nas abas **Layout** e **Estética**). Não há um “salvar só blocos” ou “só cores” separado; é tudo junto.

### 3.2 Botão **“Salvar Padrão Global”** (só superuser, perfil de layout = default)

- **Rota:** **PUT** `/api/admin/defaults/formats/{formatName}`
- **Payload:** o mesmo `buildConfigData()` acima.
- **Efeito:** sobrescreve o **arquivo JSON** em `designs/default/formats/{formatName}.json`. Isso vira o “base” para todos os usuários (quando não têm override no banco). Não mexe em `user_format_configs`.

### 3.3 Aba **Perfil** (identidade)

Aqui há **três** ações distintas:

| Ação | Rota | Payload / efeito |
|------|------|-------------------|
| **Salvar Identidade** | PUT `/api/social-profiles/{socialProfileName}` | `{ name, display_name, username, contact, genre, custom_vars }` — atualiza o perfil social na tabela `social_profiles`. |
| **Salvar Globais** | PUT `/api/user/variables` | `globalVars` (objeto chave/valor) — variáveis globais da **conta** (tabela `users`, campo `global_vars`). |
| Criar perfil | POST `/api/social-profiles` | `{ name }` — cria novo perfil social. |
| Excluir perfil | GET para obter `id` + DELETE `/api/social-profiles/{id}` | — |

Nenhuma dessas ações altera layout, blocos ou formato. Só identidade e variáveis.

### 3.4 Upload de background (dentro da aba Layout)

- **Rota:** POST `/api/settings/formats/{formatName}/background`
- **Payload:** `FormData` com o arquivo de imagem.
- **Efeito:** salva a imagem no design ativo e devolve `template_path`. O frontend atualiza `currentTemplatePath` e a URL da imagem. **O novo background só vai para o backend de fato quando o usuário clicar em “Salvar Layout”** (porque `template_path` entra no `buildConfigData()`). Se não salvar, o upload fica “solto” no servidor.

---

## 4. Onde está a “bagunça” lógica

1. **Um único botão “Salvar Layout” para tudo**  
   Layout (blocos, posições, fontes) e Estética (cores, font_bold) são um único payload. Não fica óbvio que “Estética” também é salva com o mesmo botão, e não há “salvar só estética”.

2. **Dois “perfis” na mesma tela**  
   “Layout” (perfil de layout) e “Identidade” (perfil social) soam parecidos, mas um é config visual por formato e o outro é identidade/canal. Quem não conhece o sistema pode achar que “Salvar Layout” grava também a identidade.

3. **Lista de perfis de layout**  
   Em `list_profiles`, o backend monta a lista a partir de `user_format_configs` filtrando por `profile_name`. Se existirem registros antigos com `profile_name` nulo (legado), a linha que faz `c.profile_name.lower() != "default"` pode quebrar (None). Vale normalizar: tratar `profile_name is None` como "default" e garantir que "default" apareça na lista.

4. **Perfil “default” de layout**  
   Para o perfil de layout "default", o backend pode não ter linha em `user_format_configs`; aí o GET devolve só o base do JSON. Ao dar **Salvar Layout** em "default", o backend **cria** um registro com `profile_name="default"`. A partir daí, o “default” do usuário deixa de ser só o do disco e vira o que está no banco. Isso pode ser intencional (override do default) mas não está documentado na UI.

5. **Payload com `blocks` e estrutura legada**  
   O frontend envia ao mesmo tempo as chaves “flat” (title_area, static_elements, etc.) **e** o array `blocks`. O backend grava o JSON inteiro. Na leitura, o frontend usa só a estrutura legada (`adaptLegacyToBlocks`). Ou seja, `blocks` no payload é redundante e pode gerar dúvida sobre qual fonte é a “verdade”.

6. **Background**  
   O upload de background atualiza estado local e arquivo no servidor, mas a associação ao perfil (template_path) só é persistida ao clicar em “Salvar Layout”. Se o usuário trocar de perfil ou sair sem salvar, o vínculo do novo background com aquele perfil não fica salvo.

---

## 5. Resumo visual do fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TELA LAYOUTS (ou Configurações)                                             │
│  Formato: [instagram43 ▼]  Layout: [default ▼]  Identidade: [Marcos ▼]       │
│  [ Salvar Layout ]  [ Salvar Padrão Global ] (se superuser + default)        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Aba Perfil          │  Aba Layout (topografia)  │  Aba Estética  │  Prompts  │
│  - Globais           │  - Blocos, canvas         │  - Cores       │  - Lib    │
│  - Identidade        │  - Background/template   │  - font_bold   │           │
│  [Salvar Globais]    │  (tudo salvo junto       │  (idem)        │           │
│  [Salvar Identidade]  │   no "Salvar Layout")    │                │           │
└─────────────────────────────────────────────────────────────────────────────┘

CARGA (ao mudar formato ou perfil de layout):
  GET /api/settings/formats/{formatName}/profiles
  GET /api/settings/formats/{formatName}/profiles/{layoutProfileName}
  → config → adaptLegacyToBlocks → blocks, canvas, cores, bg

CARGA (ao mudar identidade):
  GET /api/social-profiles
  GET /api/social-profiles/{socialProfileName}
  → profileIdentity (só para IA/variáveis)

SALVAMENTO:
  "Salvar Layout"     → PUT .../formats/{format}/profiles/{layoutProfile}  (buildConfigData)
  "Padrão Global"     → PUT /api/admin/defaults/formats/{format}           (mesmo payload)
  "Salvar Identidade" → PUT /api/social-profiles/{name}                     (identidade)
  "Salvar Globais"    → PUT /api/user/variables                            (globalVars)
```

---

## 6. Sugestões de melhoria

1. **Deixar explícito na UI** que “Salvar Layout” grava também as alterações da aba Estética (e que Identidade tem botões próprios).
2. **Tratar `profile_name` nulo** em `list_profiles` (considerar como "default" e não quebrar).
3. **Documentar** no backend que, ao salvar perfil "default", se cria/atualiza registro em `user_format_configs` (comportamento de “override do default”).
4. **Remover ou documentar** o campo `blocks` no payload do PUT de profile (evitar duas fontes de verdade).
5. **Opcional:** após upload de background, avisar “Alterações não salvas” ou dar opção de “Salvar layout” direto, para deixar claro que o vínculo ao perfil só persiste ao salvar.

Com isso, o fluxo da aba Layouts e a comunicação com o backend ficam claros e as inconsistências identificadas para você poder corrigir ou documentar como decisão de produto.
