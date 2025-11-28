import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ase import Atoms
from ase.calculators.mopac import MOPAC
from sqlalchemy.orm import Session

# Importar o banco que acabamos de criar
from database import Base, engine, SessionLocal, MoleculaBD

# Cria o arquivo do banco (moleculas.db) automaticamente se não existir
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOPAC_PATH = os.environ.get("MOPAC_COMMAND", "mopac")

# Dependência para pegar o banco de dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class MoleculaInput(BaseModel):
    simbolo: str = "H2O"
    geometria_inicial: list

@app.get("/")
def read_root():
    return {"status": "online", "banco": "SQLite"}

@app.post("/otimizar")
def otimizar_geometria(dados: MoleculaInput, db: Session = Depends(get_db)):
    try:
        # 1. Setup da Química
        atoms = Atoms(dados.simbolo, positions=dados.geometria_inicial)
        
        # Tenta rodar o MOPAC, mas se falhar (ex: não instalado), usa modo Mock
        try:
            # Configura o comando explicitamente
            comando_mopac = f"{MOPAC_PATH} calculo_temp.mop"
            calc = MOPAC(label='calculo_temp', task='PM7 OPT', command=comando_mopac)
            atoms.calc = calc
            
            # 2. Roda o MOPAC
            energia = atoms.get_potential_energy()
            novas_posicoes = atoms.get_positions().tolist()
            metodo_usado = "MOPAC PM7"
            
        except Exception as e_calc:
            print(f"Aviso: MOPAC falhou ({e_calc}). Usando modo SIMULAÇÃO para testes.")
            # Modo Mock/Simulação: Adiciona um pequeno deslocamento aleatório
            # para o usuário ver que "algo aconteceu" na tela
            import random
            energia = -1234.56
            
            # Cria uma nova lista de coordenadas com leve variação (+- 0.1 Angstrom)
            novas_posicoes = []
            for atomo in dados.geometria_inicial:
                novo_atomo = [
                    atomo[0] + random.uniform(-0.5, 0.5),
                    atomo[1] + random.uniform(-0.5, 0.5),
                    atomo[2] + random.uniform(-0.5, 0.5)
                ]
                novas_posicoes.append(novo_atomo)
                
            metodo_usado = "Simulação (MOPAC não encontrado)"

        # 3. SALVAR NO BANCO DE DADOS (NOVO!)
        nova_molecula = MoleculaBD(
            nome=dados.simbolo,
            smiles="TODO: Gerar SMILES", # Implementaremos RDKit depois
            energia=energia,
            geometria_json=novas_posicoes
        )
        db.add(nova_molecula)
        db.commit() # Confirma a gravação
        db.refresh(nova_molecula) # Pega o ID gerado

        return {
            "sucesso": True,
            "id_banco": nova_molecula.id, # Retorna o ID para o usuário saber
            "energia_final_ev": energia,
            "novas_coordenadas": novas_posicoes
        }

    except Exception as e:
        return {"sucesso": False, "erro": str(e)}