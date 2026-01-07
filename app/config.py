import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:admin@localhost/habit_DB"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
