# Content Creator - Automação de Mídias com IA

Bem-vindo ao **Content Creator**, um SaaS (Software as a Service) completo desenvolvido para automatizar, transcrever e estilizar vídeos e imagens utilizando o poder da Inteligência Artificial.

Este documento detalha o fluxo de engenharia, arquitetura e uso da plataforma ponta a ponta.

---

## 🚀 1. Visão Geral das Tecnologias

O projeto é dividido em uma arquitetura moderna separada por uma API robusta e uma interface de usuário ultrarrápida.

*   **Frontend**: Desenvolvido em **Next.js (React)** utilizando `Tailwind CSS` para uma interface de usuário linda, reativa e dinâmica (estilo Glassmorphism e Dark Mode).
*   **Backend**: Construído em **Python** com **FastAPI** para altíssima performance assíncrona.
*   **Banco de Dados**: **MySQL** / MariaDB relacional governado pelo **SQLAlchemy** (Assíncrono via `aiomysql`).
*   **Processamento de Mídia**: **FFmpeg** em conjunção com `Pillow` (PIL) no Python para edição nativa de vídeos e desenhos de vetores.
*   **Inteligência Artificial**: **Google AI (Gemini / Vertex)** para sumarização e adaptação de roteiros, e ferramentas de STT (Speech-to-Text) baseadas em arquivos locais ou APIs externas para transcrever falas com precisão absurda.
*   **Fila de Processamento (Workers)**: Gerenciamento em background via filas assíncronas no FastAPI para não travar a experiência HTTP.

---

## 👤 2. Contas, Login e Assinaturas (SaaS)

O ecossistema é voltado para uso multi-tenant (vários usuários), com forte controle de rotas.

1.  **Cadastro & JWT**: O usuário se registra na tela de Login e a API gera um hash seguro da senha com `bcrypt`. A autenticação no decorrer das rotas usa tokens **JWT (JSON Web Tokens)** mantendo o Backend stateless e seguro.
2.  **Sistema de Planos Exclusivo**: Ao se registrar, o usuário cai no plano padrão da base. O sistema divide os recursos e limites de inteligência artificial da conta com base nos Tiers de Assinatura:
    *   **Gratuito**: 1.000 tokens mensais limitados.
    *   **Starter**: 200.000 tokens mensais.
    *   **Profissional**: 600.000 tokens mensais.
    *   **Maestro**: 10.000.000 tokens mensais.
3.  **Controle em Tempo Real**: Diferente da maioria das soluções engessadas via CRON Job, nossa arquitetura soma o histórico de transações da tabela de `generations` dentro do range do Mês Vigente. O gasto total de tokens bloqueia novas submissões instantaneamente se o limite (Custo Estimado + Gasto) estourar, garantindo lucro para a plataforma. O saldo e a barra de progresso do usuário podem ser vistos em tempo real em sua Dashboard (`/billing`).

---

## 🎨 3. Formatos e Perfis (Customização de Layout)

Para gerar vídeos perfeitos pro Reels, TikTok e etc, o app engloba um motor inovador de Design.

*   **Formatos (Proporções)**: Na tela o usuário escolhe onde postar. O motor interpreta arquivos locais em JSON como o `stories.json`. Diferentes formatos ensinam pro motor de vídeo como construir o background borrado (blur), onde prender a mídia (top/center), sombras, margens etc.
*   **Layouts Personalizados por Conta (Perfis)**: O usuário pode criar *Perfis* ilimitados onde cada perfil guarda escolhas pessoais daquela conta. 
    * O que o perfil altera: A Fonte, a Cor da Fonte, a Borda da Fonte, Posições na tela (Exemplo: "Texto do Vídeo no Topo"). 
    * Tudo isso é salvo na tabela `format_configs` atrelado ao usuário.
*   **Upload de Fontes Próprias**: Nós suportamos que a fonte TTF seja subida pela conta para o servidor.

---

## 🎥 4. Como Upar e Criar a Mídia (O Fluxo Core)

No Painel `Dashboard`, a mágica das integrações se desenha em 2 Abas principais de captação:

1.  **Colar Links da Internet (URL Downloader)**: A API aceita links do TikTok, YouTube e Instagram. Acionamos scrapers do `yt-dlp` (ou similares embutidos) que extraem a mídia mais limpa da rede e baixam localmente na pasta temporária.
2.  **Enviar um Arquivo Nativo (Upload)**: O usuário arrasta um arquivo do PC dele. A API aceita tanto **Vídeos (MP4, MOV)** quanto **Imagens Estáticas (JPG, PNG)**.

> Uma única requisição (`POST`) cadastra o banco de dados pendente (`status = pending`) e engole a Mídia. Rapidamente a engine Web responde sucesso pro Frontend e empurra todas as formatações ativas do usuário e a URL/Media para a **Fila de Background (`generation_queue`)**.

---

## 🧠 5. Como a Mídia Ganha Vida por Trás dos Panos

Quando a fila de execução captura um trabalho pendente, o pipeline de renderização orquestra as seguintes fases críticas no arquivo `pipeline.py`:

1.  **Baixar & Auditar**: Valida se a proporção não rompe com a pedida. Se é arquivo nativo local, importa ele para o Sandbox.
2.  **Transcrição e Compreensão (A.I)**: Extrai uma amostra de áudio (se for vídeo) e transcreve tudo pra texto via Inteligência.
3.  **Roteiro Original VS Copyright (Gemini Engine)**: Aqui o núcleo chama a IA generativa para engolir o contexto sobre a mídia que acabou de processar e cria Legendas chamativas (Captions/Copies de venda), com títulos impactantes e traduções nativas (PT-BR). Isso é exportado paralelamente como um `TXT` de entrega rico formatado para que o usuário copie e cole como post.
4.  **Injeção do Motor de Design (`design_engine.py`)**: 
    * Se o perfil usar **"Blur Background"**, clonamos o vídeo base pra trás, esticamos na escala cheia do celular (1080x1920) e borramos com FFmpeg (`boxblur`). 
    * Se o perfil usar **"Background de Template (JPG)"** (ex: *instagram43*), desenhamos a arte gráfica em baixo e posicionamos o Vídeo em um overlay no centro (com `overlay=x:y`).
    * Finalmente, processamos textos no formato de Filtros Nativos `.ass` do FFmpeg e sobrepomos as fontes personalizadas e cores dinâmicas importadas da tabela do usuário.
5.  **Gravação do Custo**: Marcamos a contagem exata dos tokens gastos e da CPU na requisição de geração.

---

## 📦 6. Entrega de Volta e Notificações

1.  A página da `Dashboard` faz verificações dinâmicas sem interrupções (Long Polling) de seu histórico do banco `api.get("/generate/history")`.
2.  Assim que o Worker termina a renderização do bloco, o script `UPDATE` transforma a aba do usuário no Next.js de *Processando (Amarelo)* para **Finalizado (Verde)**.
3.  Dois novos caminhos surgem para o usuário:
    *   **Visualizador da Legenda inline**: Lê diretamente o arquivo de CopyTXT criado na nuvem pra copiar.
    *   **Botão Exportar Media**: Entrega a via real formatada e com design nativo (`.mp4` ou imagem processada) baixada direto pelo navegador.
4. Caso o Frontend englobe múltiplas edições num dia, um botão robusto de **Exportar Geração Lote ZIP** recolhe todas num passe só.
