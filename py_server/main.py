import httpx
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors
from kneed import KneeLocator
import matplotlib.pyplot as plt


pd.set_option("display.max_rows", None)
pd.set_option("display.max_columns", None)

# 横幅制限をなくす
pd.set_option("display.width", None)
pd.set_option("display.max_colwidth", None)

load_dotenv('.env')

appName = os.getenv('APP_NAME', 'MusicSearchApp')
appMail = os.getenv('APP_MAIL', 'your_email@example.com')

app = FastAPI()

columns = [
    'danceability', 'gender', 'mood_acoustic', 'mood_aggressive', 
    'mood_electronic', 'mood_happy', 'mood_party', 'mood_relaxed', 
    'mood_sad', 'timbre', 'tonal_atonal', 'voice_instrumental'
]

columns_map = {
    'danceability': 'ダンサビリティ',
    'gender': '性別',
    'mood_acoustic': 'アコースティック',
    'mood_aggressive': 'アグレッシブ',
    'mood_electronic': 'エレクトロニック',
    'mood_happy': 'ハッピー',
    'mood_party': 'パーティー',
    'mood_relaxed': 'リラックス',
    'mood_sad': 'サッド',
    'timbre': '音色',
    'tonal_atonal': '調性',
    'voice_instrumental': 'ボーカル/インスト'
}

class Track(BaseModel):
    id: str
    name: str
    artist: str
    image: str

class TrackWithFeatures(BaseModel):
    original_track: Track
    acoustic_features: Dict[str, Optional[str]]

async def get_acousticbrainz_features(client: httpx.AsyncClient, mbid: str) -> Dict[str, Optional[str]]:

    url = f"https://acousticbrainz.org/api/v1/{mbid}/high-level"
    headers = {"User-Agent": f"{appName} ({appMail})"}
    try:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        features = {}
        for feature_name in columns:
            feature_data = data.get("highlevel", {}).get(feature_name, {})

            if "all" in feature_data:
                # "not_" が付いていない key だけを取得
                positive_key = next(
                    (k for k in feature_data["all"].keys() if not k.startswith("not_")), 
                    None
                )
                if positive_key:
                    jp_key = f"{columns_map.get(feature_name, feature_name)}_{positive_key}"
                    features[jp_key] = feature_data["all"][positive_key]
                else:
                    # positive_key がない場合は None
                    jp_key = columns_map.get(feature_name, feature_name)
                    features[jp_key] = None
            else:
                # "all" がない場合は value をそのまま保存
                value = feature_data.get("value")
                jp_key = columns_map.get(feature_name, feature_name)
                features[jp_key] = value

        return features

    except httpx.HTTPStatusError as e:
        print(f"AcousticBrainz APIエラー (ID: {mbid}): {e.response.status_code}")
        return {columns_map.get(f, f): None for f in columns}
    except Exception as e:
        print(f"予期せぬエラー (ID: {mbid}): {e}")
        return {columns_map.get(f, f): None for f in columns}


@app.post("/recommend")
async def analyze_favorites(tracks: List[Track]):
    if not tracks:
        raise HTTPException(status_code=400, detail="トラックが指定されていません。")

    async with httpx.AsyncClient() as client:
        tasks = [get_acousticbrainz_features(client, track.id) for track in tracks]
        all_features = await asyncio.gather(*tasks)

    rows = []
    for track, features in zip(tracks, all_features):
        # 特徴量の全てが None ならスキップ
        if all(v is None for v in features.values()):
            continue  
        row = {
            "id": track.id,
            "name": track.name,
            "artist": track.artist,
            "image": track.image
        }
        row.update(features)
        rows.append(row)

    if not rows:
        raise HTTPException(status_code=404, detail="有効な特徴量を持つトラックがありませんでした。")

    df = pd.DataFrame(rows)

    print("\n=== 10曲の特徴量 ===")
    print(df)

    feature_cols = [col for col in df.columns if col not in ['id','name','artist','image']]

    x = df[feature_cols].values.astype(float)

    min_samples = 2
    neighbors = NearestNeighbors(n_neighbors=min_samples)
    neighbors_fit = neighbors.fit(x)
    distances, indices = neighbors_fit.kneighbors(x)

    distances = np.sort(distances[:, -1])

    kneedle = KneeLocator(range(len(distances)), distances, curve="convex", direction="increasing")
    eps = distances[kneedle.knee]

    print("推定 eps:", eps)


    db = DBSCAN(eps=eps, min_samples=2)
    label = db.fit_predict(x)

    df['cluster'] = label

    counts = df['cluster'].value_counts()
    if -1 in counts.index:
        counts = counts[counts.index != -1]
    main_cluster_label = counts.idxmax()

    feature_cols = [col for col in df.columns if col not in ['id','name','artist','image','cluster']]
    main_cluster_vector = df[df['cluster'] == main_cluster_label][feature_cols]
    preference_vector = main_cluster_vector.mean()

    response = {
        "preference_vector": preference_vector.to_dict(),  # フロントでスライダーに使える
    }


    for i, label in enumerate(label):
        print(f"{df.index[i]}: クラスタ {label}")
    print("好みベクトル")
    print(preference_vector)

    # DataFrame を JSON に変換して返す
    return response
