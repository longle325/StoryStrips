from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openai_api_key: str = ""
    exa_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    zilliz_endpoint: str = ""
    zilliz_token: str = ""

    bright_data_api_key: str = ""
    elevenlabs_api_key: str = ""
    valsea_api_key: str = ""

    port: int = 8000
    # pydantic-settings parses "http://a.com,http://b.com" env var natively into list[str]
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
