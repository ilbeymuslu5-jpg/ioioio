import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class Config:
    supplier_id: str
    api_key: str
    api_secret: str
    store_front_code: str | None
    use_stage: bool
    anthropic_api_key: str | None

    @property
    def base_url(self) -> str:
        return "https://stageapigw.trendyol.com" if self.use_stage else "https://apigw.trendyol.com"

    @property
    def user_agent(self) -> str:
        return f"{self.supplier_id} - SelfIntegration"


def load_config() -> Config:
    supplier_id = os.getenv("TRENDYOL_SUPPLIER_ID", "").strip()
    api_key = os.getenv("TRENDYOL_API_KEY", "").strip()
    api_secret = os.getenv("TRENDYOL_API_SECRET", "").strip()

    missing = [
        name
        for name, value in (
            ("TRENDYOL_SUPPLIER_ID", supplier_id),
            ("TRENDYOL_API_KEY", api_key),
            ("TRENDYOL_API_SECRET", api_secret),
        )
        if not value
    ]
    if missing:
        raise ConfigError(
            "Eksik ayarlar: "
            + ", ".join(missing)
            + ". Bunlari .env dosyasina ekle (ornek icin .env.example dosyasina bak). "
            "Bilgiler Trendyol Partner panelinde Hesap Bilgileri > Entegrasyon Bilgileri sayfasindadir."
        )

    return Config(
        supplier_id=supplier_id,
        api_key=api_key,
        api_secret=api_secret,
        store_front_code=os.getenv("TRENDYOL_STORE_FRONT_CODE", "").strip() or None,
        use_stage=os.getenv("TRENDYOL_USE_STAGE", "false").strip().lower() in ("1", "true", "yes"),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", "").strip() or None,
    )
