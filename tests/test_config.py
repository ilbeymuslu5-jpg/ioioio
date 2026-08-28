import pytest

from trendyol_agent.config import ConfigError, load_config


def test_load_config_raises_when_missing(monkeypatch):
    monkeypatch.delenv("TRENDYOL_SUPPLIER_ID", raising=False)
    monkeypatch.delenv("TRENDYOL_API_KEY", raising=False)
    monkeypatch.delenv("TRENDYOL_API_SECRET", raising=False)
    with pytest.raises(ConfigError):
        load_config()


def test_load_config_reads_env(monkeypatch):
    monkeypatch.setenv("TRENDYOL_SUPPLIER_ID", "1")
    monkeypatch.setenv("TRENDYOL_API_KEY", "key")
    monkeypatch.setenv("TRENDYOL_API_SECRET", "secret")
    monkeypatch.setenv("TRENDYOL_USE_STAGE", "true")
    config = load_config()
    assert config.supplier_id == "1"
    assert config.base_url == "https://stageapigw.trendyol.com"
