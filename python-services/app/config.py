"""
Infradyn Python Services - Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # AWS
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = ""
    
    # OpenAI
    openai_api_key: str = ""
    
    # Database
    database_url: str = ""
    
    # Service
    debug: bool = True
    allowed_origins: str = "http://localhost:3000"
    
    # Auth
    jwt_secret: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars from Next.js


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
