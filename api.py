import os
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from scipy import stats
from sklearn.preprocessing import RobustScaler, StandardScaler, MinMaxScaler
from sklearn.cluster import DBSCAN
from sklearn.decomposition import PCA
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configuración CORS para que Lovable pueda llamar a tu API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cliente Gemini Único
client = genai.Client(api_key=os.getenv("GEMINI_KEY"))

class AgenticCore:
    @staticmethod
    def process_data(df):
        # 1. Limpieza básica
        df = df.select_dtypes(include=[np.number]).dropna(axis=1, how='all')
        df = df.fillna(df.median())
        
        # 2. Escalado Adaptativo
        scaler = RobustScaler() if df.skew().abs().mean() > 1 else StandardScaler()
        df_scaled = pd.DataFrame(scaler.fit_transform(df), columns=df.columns)
        
        # 3. DBSCAN (Clustering por densidad)
        dbscan = DBSCAN(eps=0.5, min_samples=5).fit(df_scaled)
        df['cluster'] = dbscan.labels_
        
        # 4. PCA para la Galaxia Visual (Reducción a 2D)
        pca = PCA(n_components=2)
        coords = pca.fit_transform(df_scaled)
        df['x'] = coords[:, 0]
        df['y'] = coords[:, 1]
        
        return df, df_scaled

    @staticmethod
    def get_strategic_insight(relations, patterns):
        prompt = f"""
        Actúa como Senior Lead Data Scientist. Traduce estos datos técnicos a negocio.
        CONTEXTO: {patterns}
        DATOS CLAVE: {relations[:3]}

        RESPONDE EXACTAMENTE CON ESTA ESTRUCTURA:
        TITULO: (Máximo 5 palabras)
        HALLAZGO: (Máximo 4 líneas con números reales. Explica la relación principal de forma sencilla).
        REGLA_ORO: (Exactamente 3 frases siguiendo el esquema "A mayor X, se observa Y").
        """
        
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite", 
            contents=prompt
        )
        # Parseo simple del texto
        text = response.text
        lines = text.split('\n')
        return {
            "title": lines[0].replace("TITULO:", "").strip(),
            "hallazgo": lines[1].replace("HALLAZGO:", "").strip(),
            "regla_oro": [l.strip() for l in lines[2:] if "REGLA_ORO:" not in l and l.strip()]
        }

@app.post("/analyze")
async def analyze_dataset(file: UploadFile = File(...)):
    # Leer CSV
    df_raw = pd.read_csv(file.file)
    
    # Ejecutar Core
    core = AgenticCore()
    df_final, df_scaled = core.process_data(df_raw)
    
    # Validación Estadística (ANOVA para el Radar Chart)
    significant_cols = []
    clusters = [c for c in df_final['cluster'].unique() if c != -1]
    
    for col in df_scaled.columns:
        if col in ['x', 'y', 'cluster']: continue
        groups = [group[col].values for name, group in df_final[df_final['cluster'] != -1].groupby('cluster')]
        if len(groups) > 1:
            f_stat, p_val = stats.f_oneway(*groups)
            if p_val < 0.05:
                medias = df_final.groupby('cluster')[col].mean().to_dict()
                significant_cols.append({"variable": col, "f": f_stat, "medias": medias})
    
    significant_cols = sorted(significant_cols, key=lambda x: x['f'], reverse=True)

    # Obtener Insight de Gemini
    res_patrones = f"Grupos: {len(clusters)}, Ruido: {list(df_final['cluster']).count(-1)}"
    insight = core.get_strategic_insight(significant_cols, res_patrones)

    # Formatear datos para la Galaxia (Scatter Plot)
    # Enviamos solo una muestra de 500 puntos para no saturar el frontend
    galaxy_points = df_final.sample(min(500, len(df_final))).to_dict(orient="records")

    # Formatear datos para el Radar (Comparando el mejor cluster vs cluster 0)
    best_cluster = significant_cols[0]['medias'] if significant_cols else {}
    radar_data = []
    for col in significant_cols[:4]: # Top 4 variables
        var_name = col['variable']
        radar_data.append({
            "metric": var_name,
            "target": col['medias'].get(max(clusters, key=lambda c: col['medias'].get(c, 0)), 0),
            "baseline": col['medias'].get(0, 0)
        })

    return {
        "insight": insight,
        "galaxy": galaxy_points,
        "radar": radar_data,
        "stats": res_patrones
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)