from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    env: str = "development"
    database_url: str
    database_url_sync: str
    redis_url: str = "redis://redis:6379/0"
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
