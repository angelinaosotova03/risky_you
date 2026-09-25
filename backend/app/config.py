from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Без переменной окружения работает на SQLite — удобно для локальной разработки
    database_url: str = "sqlite+aiosqlite:///./dev.db"
    # Сколько первых попыток нужно, чтобы показывать процентиль по реальным игрокам
    min_norm_sample: int = 100


settings = Settings()

KNOWN_TESTS = frozenset(
    {"balloon", "loss", "patience", "decks", "trust", "ultimatum", "beauty", "reflection"}
)
