"""Application configuration, loaded from environment variables (.env)."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env."""
    app_name: str = "Dark Kitchen Mafia OS"
    app_url: str = "http://localhost:5173"
    debug: bool = True

    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "darkkitchen_db"
    db_user: str = "root"
    db_password: str = "231141"

    jwt_secret: str = "change_this_to_a_long_random_string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def database_url(self) -> str:
        """Return the database URL, using SQLite fallback when a MySQL password is not configured."""
        # Zero-config fallback: if the MySQL password was never set (still the
        # placeholder, or left blank), fall back to a local SQLite file so the
        # project runs immediately with no database setup at all. Once you put
        # a real password in .env, it automatically switches to MySQL.
        if self.db_password in ("", "your_mysql_password"):
            return f"sqlite:///{BASE_DIR / 'darkkitchen.db'}"
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()

