import os
import time
import pandas as pd
import numpy as np
from scipy import stats
from dotenv import load_dotenv

# Librerías de Machine Learning
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors

# Clientes de IA
from google import genai
from groq import Groq
from openai import OpenAI
import ollama

# Cargar configuración
load_dotenv()

# ==========================================
# CONFIGURACIÓN GLOBALES
# ==========================================
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "OLLAMA") # Por defecto local

# Inicialización de clientes (con manejo de errores si falta la key)
try:
    gemini_client = genai.Client(api_key=os.getenv("GEMINI_KEY"))
    groq_client = Groq(api_key=os.getenv("GROQ_KEY"))
    openai_client = OpenAI(api_key=os.getenv("OPENAI_KEY"))
except Exception as e:
    print(f"⚠️ Aviso: Alguna API Key no se cargó correctamente: {e}")

class ResearchTools:
    @staticmethod
    def data_agent(file_path):
        """Fase 1: Ingesta y Limpieza Profunda Adaptativa"""
        df = pd.read_csv(file_path)
        
        # Eliminar columnas 100% vacías
        df.dropna(axis=1, how='all', inplace=True)
        
        # Filtrar columnas numéricas
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Imputación de nulos y eliminación de constantes
        for col in num_cols:
            median_val = df[col].median()
            if pd.isna(median_val) or df[col].nunique() <= 1:
                df.drop(columns=[col], inplace=True)
            else:
                df[col] = df[col].fillna(median_val)

        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Decisión de Escalado
        skewness = df[num_cols].skew().abs().mean()
        Q1, Q3 = df[num_cols].quantile(0.25), df[num_cols].quantile(0.75)
        IQR = Q3 - Q1
        outlier_ratio = ((df[num_cols] < (Q1 - 1.5 * IQR)) | (df[num_cols] > (Q3 + 1.5 * IQR))).sum().sum() / df[num_cols].size

        if outlier_ratio > 0.05:
            scaler = RobustScaler()
            method = "RobustScaler (Outliers detectados)"
        elif skewness > 1:
            scaler = MinMaxScaler()
            method = "MinMaxScaler (Alta asimetría)"
        else:
            scaler = StandardScaler()
            method = "StandardScaler (Distribución Normal)"

        df_scaled = df.copy()
        df_scaled[num_cols] = scaler.fit_transform(df[num_cols])
        return df, df_scaled, f"Normalización via {method} sobre {len(num_cols)} variables."

    @staticmethod
    def pattern_discovery_agent(df_scaled, df_original):
        """Fase 2: Clustering por Densidad (DBSCAN)"""
        num_df = df_scaled.select_dtypes(include=[np.number])
        print(f"🧠 Agentic-IA: Analizando topología de densidad...")
        
        # Auto-tuning de EPS (Distancia entre vecinos)
        neigh = NearestNeighbors(n_neighbors=2)
        nbrs = neigh.fit(num_df)
        distances, _ = nbrs.kneighbors(num_df)
        eps_estimado = np.percentile(distances[:, 1], 90)
        if eps_estimado <= 0: eps_estimado = 0.5
        
        dbscan = DBSCAN(eps=eps_estimado, min_samples=5).fit(num_df)
        df_original['cluster'] = dbscan.labels_
        
        n_clusters = len(set(dbscan.labels_)) - (1 if -1 in dbscan.labels_ else 0)
        n_noise = list(dbscan.labels_).count(-1)
        
        return df_original, f"DBSCAN: {n_clusters} grupos hallados, {n_noise} puntos de ruido."

    @staticmethod
    def validation_agent(df):
        """Fase 3: Validación Estadística y Comparación de Magnitudes"""
        clusters_validos = [c for c in df['cluster'].unique() if c != -1]
        if len(clusters_validos) < 2:
            return "AVISO: No hay grupos suficientes para contrastar tendencias."

        numeric_cols = df.select_dtypes(include=[np.number]).columns
        significant_relations = []
        
        for col in numeric_cols:
            if col == 'cluster': continue
            
            # ANOVA para confirmar separación
            groups = [group[col].values for name, group in df[df['cluster'] != -1].groupby('cluster')]
            f_stat, p_val = stats.f_oneway(*groups)
            
            if p_val < 0.05:
                # Extraemos medias para que la IA vea la dirección del dato
                medias = df[df['cluster'] != -1].groupby('cluster')[col].mean().to_dict()
                significant_relations.append({
                    "variable": col, 
                    "p_value": p_val, 
                    "impacto_f": round(f_stat, 2),
                    "medias_por_cluster": medias
                })
        
        return sorted(significant_relations, key=lambda x: x['impacto_f'], reverse=True)

class AgenticResearcher:
    def __init__(self, dataset_path):
        self.dataset_path = dataset_path
        self.tools = ResearchTools()

        # --- VALIDACIÓN TÉCNICA ---
        # - Comportamiento: (Dirección de las tendencias: alcistas/bajistas).
        # - Robustez: (Veredicto sobre si el patrón es sólido).

        # 1. MAPEO DE TENDENCIAS: Compara los valores de 'medias_por_cluster'. Explica qué variables suben o bajan entre grupos.
        # 2. ANÁLISIS MECÁNICO: Explica la causalidad probable entre las variables con más impacto F.
        # 3. DETECTA POSIBLES COLUMNAS DE IDS DE SUJETO O USUARIO Y EVITA QUE INFLUYAN EN LA CONCLUSIÓN

    def get_explanation(self, relations, res_patrones):
        if isinstance(relations, str): return relations
        
        # Reducimos relaciones para no quemar tokens de la cuota
        top_relations = relations[:5]

        # 2. Limpiamos los decimales para ahorrar miles de caracteres
        for rel in top_relations:
            rel['p_value'] = f"{rel['p_value']:.4e}" # Formato científico corto
            # Redondeamos las medias de los clústeres
            if 'distribucion_medias' in rel:
                rel['distribucion_medias'] = {k: round(v, 2) for k, v in rel['distribucion_medias'].items()}

        prompt = f"""
        Actúa como un Senior Lead Data Scientist. Analiza la arquitectura de este dataset.
        
        CONTEXTO CLÚSTERES: {res_patrones}
        RELACIONES CLAVE (ANOVA + MEDIAS): {top_relations}

        FORMATO DE RESPUESTA (RESPONDE SOLO CON ESTOS APARTADOS. LO ANTERIOR ES PARA QUE LO ANALICES Y LA RESPUESTA SEA MEJOR)
        - Título: (Máximo 5 palabras sobre el patrón hallado).
        - El Hallazgo: (Máximo 4 líneas explicando la relación principal con números. No seas técnico, explícalo de forma que se entienda fácilmente).
        - Regla de Oro: (Explicación NO TÉCNICA de exactamente 3 frases siguiendo el esquema "A mayor X, se observa Y").

        INSTRUCCIÓN CRÍTICA: En 'El Hallazgo', usa los valores de las medias para comparar los grupos (ej. 'El grupo A gasta 500€ frente a los 100€ del grupo B'). No menciones palabras como 'ANOVA', 'p-value' o 'DBSCAN' en la sección de INSIGHT ESTRATÉGICO.
        """

        try:
            if LLM_PROVIDER == "OLLAMA":
                res = ollama.chat(model=os.getenv("OLLAMA_MODEL", "llama3.2"), 
                                  messages=[{'role': 'user', 'content': prompt}])
                return res['message']['content'].strip()
            
            elif LLM_PROVIDER == "GROQ":
                res = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "user", "content": prompt}])
                return res.choices[0].message.content.strip()

            elif LLM_PROVIDER == "GEMINI":
                res = gemini_client.models.generate_content(
                    model=os.getenv("GEMINI_MODEL"), contents=prompt)
                return res.text.strip()
            
            elif LLM_PROVIDER == "OPENAI":
                res = openai_client.chat.completions.create(
                    model=os.getenv("OPENAI_MODEL"),
                    messages=[{"role": "user", "content": prompt}])
                return res.choices[0].message.content.strip()

        except Exception as e:
            return f"⚠️ Error en {LLM_PROVIDER}: {str(e)[:150]}. Cambia el proveedor en el .env"

    def run(self):
        print(f"🚀 Investigando con {LLM_PROVIDER} en: {self.dataset_path}")
        
        # 1. Datos
        self.df_original, self.df_scaled, res_data = self.tools.data_agent(self.dataset_path)
        print(f"✅ {res_data}")

        # 2. Patrones
        self.df_original, res_patrones = self.tools.pattern_discovery_agent(self.df_scaled, self.df_original)
        print(f"✅ {res_patrones}")

        # 3. Validación
        relaciones = self.tools.validation_agent(self.df_original)
        print(f"✅ Validación estadística completada.")

        # 4. Narrativa
        narrativa = self.get_explanation(relaciones, res_patrones)
        
        print("\n" + "="*60)
        print(f"RESULTADO DEL AGENTE INVESTIGADOR:\n{narrativa}")
        print("="*60 + "\n")

if __name__ == "__main__":
    # Cambia esto por el dataset que quieras probar
    investigador = AgenticResearcher("./marketing_campaign_performance_10000.csv")
    investigador.run()