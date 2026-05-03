import os
import io
import json
import asyncio
import pandas as pd
import numpy as np
from scipy import stats
from dotenv import load_dotenv

# FastAPI
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Machine Learning
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors
from sklearn.decomposition import PCA

# AI Client
from google import genai

# Load environment variables
load_dotenv()

# Initialize Gemini
try:
    gemini_client = genai.Client(api_key=os.getenv("GEMINI_KEY"))
except Exception as e:
    print(f"⚠️ Aviso: Gemini API Key no se cargó correctamente: {e}")
    gemini_client = None

app = FastAPI(title="Agentic Researcher API")

# Enable CORS for Lovable and other frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearcherManager:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        
    async def run(self, csv_text: str):
        # 1. Ingesting
        await self.emit_status("INGESTING")
        df_original, df_scaled = await asyncio.to_thread(self._clean_data, csv_text)
        
        # 2. Cleaning & Pattern Discovery
        await self.emit_status("CLEANING")
        df_original, cluster_stats = await asyncio.to_thread(self._find_patterns, df_scaled, df_original)
        
        # 3. Validation and Topology Extraction
        await self.emit_status("VALIDATING")
        relaciones, topology, axes = await asyncio.to_thread(self._validate_and_extract_topology, df_original)
        
        # 4. Generating Narrative Insights
        await self.emit_status("GENERATING_INSIGHTS")
        insight = await asyncio.to_thread(self._generate_narrative, relaciones, cluster_stats)
        
        # 5. Final Result
        final_result = {
            "type": "FINAL_RESULT",
            "topology": topology,
            "axes": axes,
            "stats": cluster_stats,
            "insight": insight
        }
        await self.websocket.send_json(final_result)
        
    async def emit_status(self, stage: str):
        await self.websocket.send_json({"type": "STATUS", "stage": stage})

    def _clean_data(self, csv_text):
        df = pd.read_csv(io.StringIO(csv_text))
        
        # Deep Cleaning
        df.dropna(axis=1, how='all', inplace=True)
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        for col in num_cols:
            median_val = df[col].median()
            if pd.isna(median_val) or df[col].nunique() <= 1:
                df.drop(columns=[col], inplace=True)
            else:
                df[col] = df[col].fillna(median_val)

        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Adaptive Scaling
        skewness = df[num_cols].skew().abs().mean()
        Q1, Q3 = df[num_cols].quantile(0.25), df[num_cols].quantile(0.75)
        IQR = Q3 - Q1
        outlier_ratio = ((df[num_cols] < (Q1 - 1.5 * IQR)) | (df[num_cols] > (Q3 + 1.5 * IQR))).sum().sum() / df[num_cols].size

        if outlier_ratio > 0.05:
            scaler = RobustScaler()
        elif skewness > 1:
            scaler = MinMaxScaler()
        else:
            scaler = StandardScaler()

        df_scaled = df.copy()
        df_scaled[num_cols] = scaler.fit_transform(df[num_cols])
        return df, df_scaled

    def _find_patterns(self, df_scaled, df_original):
        num_df = df_scaled.select_dtypes(include=[np.number])
        
        # Density Topology Auto-tuning
        neigh = NearestNeighbors(n_neighbors=2)
        nbrs = neigh.fit(num_df)
        distances, _ = nbrs.kneighbors(num_df)
        eps_estimado = np.percentile(distances[:, 1], 90)
        if eps_estimado <= 0: eps_estimado = 0.5
        
        dbscan = DBSCAN(eps=eps_estimado, min_samples=5).fit(num_df)
        df_original['cluster'] = dbscan.labels_
        
        n_noise = list(dbscan.labels_).count(-1)
        
        stats_data = {
            "n_total": int(len(df_original)),
            "clustered": int(len(df_original) - n_noise),
            "noise": int(n_noise)
        }
        return df_original, stats_data

    def _validate_and_extract_topology(self, df):
        clusters_validos = [c for c in df['cluster'].unique() if c != -1]
        numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != 'cluster']
        
        significant_relations = []
        if len(clusters_validos) >= 2:
            for col in numeric_cols:
                groups = [group[col].values for name, group in df[df['cluster'] != -1].groupby('cluster')]
                f_stat, p_val = stats.f_oneway(*groups)
                if p_val < 0.05:
                    medias = df[df['cluster'] != -1].groupby('cluster')[col].mean().to_dict()
                    significant_relations.append({
                        "variable": col, 
                        "p_value": p_val, 
                        "impacto_f": round(float(f_stat), 2),
                        "medias_por_cluster": medias
                    })
        
        significant_relations = sorted(significant_relations, key=lambda x: x['impacto_f'], reverse=True)
        
        # Extract Topology (PCA or Strategic Cut)
        if len(significant_relations) >= 2:
            x_col = significant_relations[0]['variable']
            y_col = significant_relations[1]['variable']
            
            axes = {"x_label": x_col, "y_label": y_col}
            
            x_data = df[x_col].tolist()
            y_data = df[y_col].tolist()
        else:
            if len(numeric_cols) >= 2:
                pca = PCA(n_components=2)
                pca_res = pca.fit_transform(df[numeric_cols].fillna(0))
                x_data = pca_res[:, 0].tolist()
                y_data = pca_res[:, 1].tolist()
                axes = {"x_label": "PCA_1", "y_label": "PCA_2"}
            else:
                x_data = [0] * len(df)
                y_data = [0] * len(df)
                axes = {"x_label": "N/A", "y_label": "N/A"}

        topology = []
        cluster_data = df['cluster'].tolist()
        for x, y, c in zip(x_data, y_data, cluster_data):
            topology.append({"x": float(x), "y": float(y), "cluster": int(c)})
            
        return significant_relations, topology, axes

    def _generate_narrative(self, relations, cluster_stats):
        if not gemini_client:
            return {
                "finding": "API Key de Gemini no encontrada.",
                "golden_rule": "Configura la variable GEMINI_KEY en tu archivo .env.",
                "confidence_score": 0.0
            }

        top_relations = relations[:5]
        for rel in top_relations:
            rel['p_value'] = f"{rel['p_value']:.4e}"
            if 'medias_por_cluster' in rel:
                rel['medias_por_cluster'] = {k: round(v, 2) for k, v in rel['medias_por_cluster'].items()}

        prompt = f"""
        Actúa como un Senior Lead Data Scientist. Analiza la arquitectura de este dataset.
        
        CONTEXTO CLÚSTERES: {cluster_stats}
        RELACIONES CLAVE (ANOVA + MEDIAS): {top_relations}

        INSTRUCCIÓN CRÍTICA: Debes responder EXCLUSIVAMENTE con un objeto JSON válido.
        El JSON debe tener la siguiente estructura exacta:
        {{
            "finding": "Título y hallazgo principal (máximo 4 líneas explicando la relación principal con números, usando las medias de forma clara, sin jerga como ANOVA o p-value)",
            "golden_rule": "Regla de Oro: Explicación NO TÉCNICA de exactamente 3 frases siguiendo el esquema 'A mayor X, se observa Y'",
            "confidence_score": 0.95
        }}

        Para el campo 'confidence_score': Basado en los p-values y la distribución de clústeres proporcionada, asigna un puntaje de confianza del 0 al 1 donde 1 es una certeza científica absoluta.
        """

        try:
            model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            # fallback to 2.5 flash if 2.0 lite is not configured, but preferring 2.0-flash-lite as user said
            if model_name == "gemini-2.5-flash": 
                 model_name = "gemini-2.0-flash-lite"
                 
            res = gemini_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config={
                    "response_mime_type": "application/json"
                }
            )
            return json.loads(res.text.strip())
        except Exception as e:
            print(f"⚠️ Error llamando a Gemini: {e}")
            return {
                "finding": "No se pudo generar el insight debido a un error de conexión o configuración con la IA.",
                "golden_rule": f"Error: {str(e)[:100]}",
                "confidence_score": 0.0
            }


@app.websocket("/ws/analyze")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        csv_text = await websocket.receive_text()
        manager = ResearcherManager(websocket)
        await manager.run(csv_text)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "ERROR", "message": str(e)})
        except:
            pass


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)