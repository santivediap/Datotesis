# Etapa 1: Construcción del frontend (Node.js)
FROM node:20-alpine AS build-frontend
WORKDIR /frontend

# Copiar archivos de dependencias y código fuente del frontend
COPY client/package*.json ./
RUN npm install
COPY client/ ./
# Compilar el frontend (genera la carpeta dist/)
RUN npm run build

# Etapa 2: Entorno de ejecución y Backend (Python)
FROM python:3.11-slim
WORKDIR /app

# Instalar dependencias del backend
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY server/ .

# Copiar el build generado en la Etapa 1 hacia la carpeta /static
COPY --from=build-frontend /frontend/dist /app/static

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar la aplicación FastAPI
CMD ["python", "api.py"]
