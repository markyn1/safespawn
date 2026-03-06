"""
core/downloader.py
Baixa vídeos de URLs do Instagram e TikTok usando yt-dlp.
Salva os arquivos em output_dir (normalmente /input).
"""

import os
import re
import subprocess
from datetime import datetime


SUPPORTED_DOMAINS = re.compile(
    r"(instagram\.com|tiktok\.com|vm\.tiktok\.com|instagr\.am|youtube\.com|youtu\.be)",
    re.IGNORECASE,
)


class VideoDownloader:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def download(self, urls: list[str]) -> list[str]:
        """
        Baixa cada URL para output_dir.
        Retorna lista de caminhos dos arquivos baixados com sucesso.
        """
        if not urls:
            return []

        downloaded = []
        for url in urls:
            url = url.strip()
            if not url or url.startswith("#"):
                continue
            if not SUPPORTED_DOMAINS.search(url):
                print(f"[Downloader] \u26a0\ufe0f  URL n\u00e3o suportada (s\u00f3 Instagram/TikTok/YouTube): {url}")
                continue

            print(f"[Downloader] ⬇️  Baixando: {url}")
            path = self._download_one(url)
            if path:
                print(f"[Downloader] ✅ Salvo em: {os.path.basename(path)}")
                downloaded.append(path)
            else:
                print(f"[Downloader] ❌ Falha ao baixar: {url}")

        return downloaded

    def _download_one(self, url: str) -> str | None:
        """Chama yt-dlp para baixar uma URL. Retorna o caminho do arquivo ou None."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Template de nome: evita colisões e mantém rastreabilidade
        output_template = os.path.join(self.output_dir, f"dl_{timestamp}_%(id)s.%(ext)s")

        cmd = [
            "yt-dlp",
            "--no-playlist",          # Não baixar playlists inteiras por acidente
            "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--output", output_template,
            "--quiet",
            "--no-warnings",
            "--print", "after_move:filepath",  # Imprime o caminho final após mover
            url,
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode == 0:
                # Última linha do stdout é o caminho do arquivo
                lines = result.stdout.strip().splitlines()
                if lines:
                    filepath = lines[-1].strip()
                    if os.path.isfile(filepath):
                        return filepath
                # Fallback: procura o arquivo mais recente na pasta
                return self._find_latest_file()
            else:
                err = result.stderr.strip()
                print(f"[Downloader] yt-dlp error: {err[:300]}")
                return None
        except FileNotFoundError:
            raise EnvironmentError(
                "\n\n❌ yt-dlp não encontrado no PATH.\n"
                "Instale com:\n"
                "  pip install yt-dlp\n"
                "ou\n"
                "  winget install yt-dlp\n"
            )
        except subprocess.TimeoutExpired:
            print(f"[Downloader] ⏱️  Timeout ao baixar: {url}")
            return None

    def _find_latest_file(self) -> str | None:
        """Retorna o arquivo mais recente na pasta de output (fallback)."""
        try:
            files = [
                os.path.join(self.output_dir, f)
                for f in os.listdir(self.output_dir)
                if os.path.isfile(os.path.join(self.output_dir, f))
                and f.startswith("dl_")
            ]
            if files:
                return max(files, key=os.path.getmtime)
        except Exception:
            pass
        return None


def read_links_file(links_path: str) -> list[str]:
    """
    Lê um arquivo links.txt (uma URL por linha).
    Ignora linhas vazias e comentários (#).
    """
    if not os.path.isfile(links_path):
        return []
    with open(links_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return [
        line.strip()
        for line in lines
        if line.strip() and not line.strip().startswith("#")
    ]
