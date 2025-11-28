# Imagem base leve do Python
FROM python:3.9-slim

# Instala bibliotecas do sistema necessárias para cálculos científicos
RUN apt-get update && apt-get install -y \
    libomp-dev \
    && rm -rf /var/lib/apt/lists/*

# Configura pasta de trabalho
WORKDIR /app

# Instala as dependências do Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY backend/ .

# Comando para rodar a API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]