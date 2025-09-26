# Sound Profile
Sound Profile: あなたの潜在的な音楽DNAを解き明かす
このアプリケーションは、あなたが選んだ10曲の「好きな曲」から、あなた自身も気づいていないかもしれない音楽の嗜好性を分析し、可視化するWebアプリケーションです。

✨ アプリケーションのコンセプト
多くの音楽好きは、自分の好みを「ロックが好き」「落ち着いた曲が好き」といった言葉で表現します。しかし、その背景には「明るい音色で、ボーカルが少なく、リラックスできる曲」といった、より詳細な音響的特徴の組み合わせが隠されています。

Sound Profile は、その隠れた詳細な音響的特徴を解き明かすことを目的としています。ユーザーがお気に入り曲を選ぶだけで、機械学習がその核心となる特徴を抽出し、あなたのためのユニークな音楽プロファイルを生成します。

ユーザー体験の流れ (User Journey)
探す (Search): アーティスト名や曲名で、あなたの好きな曲をMusicBrainzの広大なデータベースから検索します。

選ぶ (Select): 検索結果から「これだ！」と思う曲を、お気に入りリストに追加していきます。（10曲まで）

分析する (Analyze): 10曲集まったら「分析ボタン」をクリック。あなたの選んだ楽曲データが分析サーバーへ送られます。

発見する (Discover): 分析結果がレーダーチャートで表示されます。ダンス向きか、アコースティックか、ハッピーな曲調を好むのか… あなたの新たな一面を発見できます。

🏛️ アーキテクチャと技術的ハイライト
このアプリケーションは、役割を明確に分離した2つのバックエンドサーバーを持つ構成を採用しています。

[ User (Browser) ]
       |
       v
[ Frontend ] (HTML, CSS, Vanilla JS)
       |
       |--- (API Request: Search, Favorites) ---> [ Web Server (Node.js / Express) ] -- (API Call) --> [ MusicBrainz API ]
       |                                                                                              [ CoverArt API ]
       |
       '--- (API Request: Analyze) -------------> [ Analysis Server (Python / FastAPI) ] - (API Call) --> [ AcousticBrainz API ]
                                                                      |
                                                                      '-- (ML Processing: Scikit-learn) --> [ Preference Vector ]

こだわった技術的ポイント
役割を分離したバックエンド構成

なぜ？: Webリクエストの受付と、計算負荷の高いデータ分析処理を分離することで、それぞれの役割に最適な技術（Node.jsの非同期I/O、Pythonの豊富な分析ライブラリ）を活かしたかったためです。

どう実現したか？: ユーザーとのやり取りや外部API連携を担うNode.js/Expressサーバーと、機械学習モデルの実行に特化したPython/FastAPIサーバーを構築。サーバー間はREST APIで通信する、


機械学習(DBSCAN)による "本質的な好み" の抽出

なぜ？: ユーザーが選ぶ10曲の中には、気分で選んだ少し毛色の違う曲（外れ値）が含まれる可能性があります。単純な平均値では、その外れ値に結果が引っ張られてしまいます。

どう実現したか？: 密度ベースクラスタリングアルゴリズムのDBSCANを採用。音響特徴ベクトルの空間上で最も密度の高い楽曲グループ（= 最も似通った曲の集まり）を特定し、そのグループのみで平均を計算します。これにより、ノイズに惑わされない、ユーザーの「好みの中核」をより正確に捉えることができます。

使用技術スタック
Frontend: HTML5, CSS3, Vanilla JavaScript, Axios

Web Server: Node.js, Express

Analysis Server: Python, FastAPI, Pandas, Scikit-learn

External APIs: MusicBrainz, Cover Art Archive, AcousticBrainz

Environment: dotenv

🚀 セットアップと実行方法
1. リポジトリのクローンと.envファイルの準備
git clone [https://github.com/YOUR_USERNAME/sound-profile.git](https://github.com/YOUR_USERNAME/sound-profile.git)
cd sound-profile

# Webサーバー用の.envファイルを作成
cp .env.example .env
# nano .env (エディタで必要な情報を追記)

2. Webサーバー (Node.js) の起動
# 依存関係のインストール
npm install

# サーバー起動
npm start
# -> http://localhost:3000 で待受開始

3. 分析サーバー (Python) の起動
# (プロジェクト内のPythonディレクトリへ移動)
cd py_server

# 仮想環境のセットアップと有効化
python -m venv venv
source venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt

# 分析サーバー用の.envファイルを作成
cp .env.example .env
# nano .env 
APP_MAIL = ""
APP_NAME = ""
PY_URL = "http://127.0.0.1:8000/recommend"

# サーバー起動
uvicorn main:app --reload

その後、ブラウザで http://localhost:3000 にアクセスしてください。
