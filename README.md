# Content Creator — Automação de Mídias com IA

O **Content Creator** é um SaaS completo para automatização, transcrição e estilização de vídeos e imagens utilizando Inteligência Artificial (OpenAI/Gemini).

## 🚀 Tecnologias
- **Backend:** Python (FastAPI) + SQLAlchemy (MySQL)
- **Frontend:** Next.js + Tailwind CSS
- **Mídia:** FFmpeg + Pillow
- **IA:** OpenAI / Google Gemini

---

## 🛠️ Pré-requisitos
Antes de começar, certifique-se de ter instalado:
1.  **Python 3.10+**
2.  **Node.js 18+**
3.  **MySQL / MariaDB**
4.  **FFmpeg** (deve estar no PATH do sistema)

#### Instalar o FFmpeg (Windows)

Sim, o FFmpeg precisa ser instalado manualmente (não é um pacote Python). Opções:

- **winget** (recomendado):
  ```powershell
  winget install FFmpeg
  ```
  Depois, feche e abra o terminal; o instalador costuma adicionar ao PATH.

- **Chocolatey:** `choco install ffmpeg`
- **Manual:** baixe em [ffmpeg.org](https://ffmpeg.org/download.html), extraia (ex.: `C:\ffmpeg`) e use a pasta que contém `ffmpeg.exe` (geralmente `C:\ffmpeg\bin`) no PATH.

#### PATH: sessão atual vs permanente (Windows)

**Só nesta sessão do PowerShell:**
```powershell
.\scripts\set-path.ps1
```
Ou em uma linha (ajuste o caminho do FFmpeg se for outro):
```powershell
$env:Path = "$PWD\venv\Scripts;C:\ffmpeg\bin;" + $env:Path
```

**Deixar o PATH permanente** (para seu usuário; não precisa rodar de novo):

1. **Pelo PowerShell** (execute como usuário normal):
   ```powershell
   $venv = (Resolve-Path ".\venv\Scripts").Path
   $ffmpeg = "C:\ffmpeg\bin"   # ajuste se instalou em outro lugar
   $current = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$venv;$ffmpeg;$current", "User")
   ```
   Feche e abra o terminal para o novo PATH valer.

2. **Pela interface do Windows:**
   - Tecla Windows → digite "variáveis de ambiente" → "Editar as variáveis de ambiente do sistema"
   - Em "Variáveis do usuário" clique em "Path" → "Editar" → "Novo"
   - Adicione: `C:\...\safespawn\venv\Scripts` (caminho completo da pasta do projeto) e a pasta do FFmpeg (ex.: `C:\ffmpeg\bin`)
   - OK em todas as janelas e abra um terminal novo.

---

## ⚙️ Configuração (Setup)

### 1. Backend e CLI
No diretório raiz do projeto:

1.  Crie um ambiente virtual:
    ```bash
    python -m venv venv
    source venv/bin/activate  # ou venv\Scripts\activate no Windows
    ```
2.  Instale as dependências:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure o arquivo `.env`:
    - Copie o `.env.example` para `.env`
    - Adicione sua `OPENAI_API_KEY`.
    - Configure `DB_USER` e `DB_PASS` se necessário (padrão é root sem senha).

### 2. Frontend
No diretório `web-app`:

1.  Instale as dependências:
    ```bash
    npm install
    ```

---

## 🏃 Como Rodar

O projeto pode ser executado em dois modos: **CLI (Linha de Comando)** para processamento local ou **SaaS (API + Web)**.

### Modo CLI (Pipeline Direto)
Execute o pipeline diretamente para arquivos na pasta `/input`:
```bash
python main.py
```
*Opções:*
- `--format feed|reels|stories`: Sobrescreve o formato.
- `--url <link>`: Baixa mídia do Instagram/TikTok antes de processar.
- `--no-ai`: Pula chamadas de IA (usa placeholders).

### Modo SaaS (Web App)
1.  **Inicie a API:**
    No diretório raiz:
    ```bash
    uvicorn api.main:app --reload
    ```
    *Se aparecer "uvicorn não é reconhecido", use:* `python -m uvicorn api.main:app --reload`  
    *A API criará o banco `content_creator_db` e as tabelas automaticamente no primeiro boot.*

2.  **Inicie o Frontend:**
    No diretório `web-app`:
    ```bash
    npm run dev
    ```
    Acesse: `http://localhost:3000`

---

## 📂 Estrutura do Projeto
- `/api`: Servidor FastAPI, rotas e lógica de banco de dados.
- `/core`: Núcleo de processamento (IA, Design Engine, Editores).
- `/web-app`: Frontend Next.js.
- `/input` e `/output`: Pastas de trabalho para mídias.
- `/designs`: Templates e configurações de layout.
