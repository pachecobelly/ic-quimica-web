from sqlalchemy import create_engine, Column, Integer, String, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Conexão (Aqui usamos SQLite. No futuro, mudamos para Postgres aqui)
SQLALCHEMY_DATABASE_URL = "sqlite:///./moleculas.db"

# Cria o motor do banco
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 2. A Tabela de Moléculas
class MoleculaBD(Base):
    __tablename__ = "moleculas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, default="Desconhecido")
    smiles = Column(String, index=True)  # A "string" da molécula
    energia = Column(Float)              # Resultado do MOPAC
    geometria_json = Column(JSON)        # Guardamos o XYZ aqui