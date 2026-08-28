import json

from anthropic import Anthropic
from rich.console import Console

from trendyol_agent.client import TrendyolClient
from trendyol_agent.config import Config
from trendyol_agent.tools import TOOLS, WRITE_TOOL_NAMES, dispatch

MODEL = "claude-sonnet-5"

SYSTEM_PROMPT = (
    "Sen bir Trendyol satici paneli asistanisin. Kullanicinin Turkce dogal dil "
    "komutlarini, sana taniml verilen araclari (tool) kullanarak Trendyol Marketplace "
    "API'si uzerinde calistirirsin. Emin olmadigin bilgi (barkod, siparis numarasi, "
    "fiyat vb.) icin varsayim yapma, kullanicidan netlestirme iste. Islem sonuclarini "
    "kisa ve acik Turkce ile ozetle. Sadece verilen araclarla yapilabilecek islemleri "
    "yapabilirsin; panelde arac olarak sunulmayan bir islem istenirse bunu acikca soyle."
)


class SellerAgent:
    def __init__(self, config: Config, auto_confirm: bool = False, console: Console | None = None):
        if not config.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY ayarli degil. Dogal dil komutlarini yorumlamak icin .env "
                "dosyasina eklemen gerekiyor."
            )
        self.client = TrendyolClient(config)
        self.anthropic = Anthropic(api_key=config.anthropic_api_key)
        self.auto_confirm = auto_confirm
        self.console = console or Console()
        self.messages: list[dict] = []

    def _confirm(self, tool_name: str, tool_input: dict) -> bool:
        if self.auto_confirm:
            return True
        self.console.print(
            f"[yellow]Bu islem panelde gercek bir degisiklik yapacak:[/yellow] "
            f"[bold]{tool_name}[/bold]({json.dumps(tool_input, ensure_ascii=False)})"
        )
        answer = input("Onayliyor musun? [e/H]: ").strip().lower()
        return answer in ("e", "evet", "y", "yes")

    def run(self, user_message: str) -> str:
        self.messages.append({"role": "user", "content": user_message})

        while True:
            response = self.anthropic.messages.create(
                model=MODEL,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                tools=[{k: v for k, v in tool.items() if k != "is_write"} for tool in TOOLS],
                messages=self.messages,
            )
            self.messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason != "tool_use":
                return "".join(block.text for block in response.content if block.type == "text")

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                tool_results.append(self._execute_tool(block.id, block.name, block.input))

            self.messages.append({"role": "user", "content": tool_results})

    def _execute_tool(self, tool_use_id: str, name: str, tool_input: dict) -> dict:
        if name in WRITE_TOOL_NAMES and not self._confirm(name, tool_input):
            return {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": "Kullanici bu islemi onaylamadi, islem yapilmadi.",
            }
        try:
            result = dispatch(self.client, name, tool_input)
            return {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": json.dumps(result, ensure_ascii=False, default=str)[:8000],
            }
        except Exception as exc:  # noqa: BLE001 - hatayi modele geri bildiriyoruz
            return {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": f"Hata: {exc}",
                "is_error": True,
            }
