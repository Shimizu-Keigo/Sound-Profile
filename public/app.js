const artistInput = document.getElementById('artistInput');
const titleInput = document.getElementById('titleInput');
const searchForm = document.getElementById('searchForm');
const resultsDiv = document.getElementById('results');
const favoritesDiv = document.getElementById('favorites');
const favCountSpan = document.getElementById('favCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const analyzeBtn = document.getElementById("analyzeBtn");

let currentOffset = 0;
let totalResults = 0;
const limit = 10;
let favorites = [];

const performSearch = async (offset) => {
    const artist = artistInput.value;
    const title = titleInput.value;

    if(!artist && !title) {
        resultsDiv.innerHTML = '';
        updatePaginationControls(0, 0);
        return
    }

    try {
        const response = await fetch(`/search?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}&offset=${offset}`);
        const data = await response.json();
        
        resultsDiv.innerHTML = '';
        data.tracks.forEach(track => {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'track-item';
            trackDiv.innerHTML = `
                <img src="${track.image || '/default-cover.jpg'}" alt="${track.name}">
                <div>
                    <strong>${track.name}</strong><br>
                    <span>${track.artist}</span>
                </div>
                <div>
                    <button class="fav-button">お気に入り</button>
                </div>
            `;
            resultsDiv.appendChild(trackDiv);
            
            const favButton = trackDiv.querySelector('.fav-button');
            favButton.addEventListener('click', () => addToFavorites(track));
        });

        // ページネーションの状態を更新
        updatePaginationControls(data.total, offset);

    } catch (error) {
        console.error('Error fetching search results:', error);
    }
};

// --- ページネーションのUIを更新する関数 ---
const updatePaginationControls = (total, offset) => {
    totalResults = total;
    currentOffset = offset;

    if (totalResults > 0) {
        pageInfo.textContent = `Showing ${offset + 1} - ${Math.min(offset + limit, total)} of ${total}`;
    } else {
        pageInfo.textContent = '';
    }

    prevBtn.style.display = offset > 0 ? 'inline' : 'none';
    nextBtn.style.display = (offset + limit) < total ? 'inline' : 'none';
};

// --- 2. お気に入りリストを画面に描画する専門の関数 ---
const renderFavorites = () => {
    favoritesDiv.innerHTML = ''; // 一旦空にする
    favCountSpan.textContent = favorites.length; // 曲数を更新

    favorites.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        // (お気に入りリストからはお気に入りボタンを消す)
        trackDiv.innerHTML = `
            <img src="${track.image}" alt="${track.name}">
            <div>
                <strong>${track.name}</strong><br>
                <span>${track.artist}</span>
            </div>
            <div>
                <button class="delete-button">削除</button>
            </div>
        `;
        favoritesDiv.appendChild(trackDiv);
        const delButton = trackDiv.querySelector('.delete-button');
        delButton.addEventListener('click', () => {
            deleteFromFavorites(track);
        });
    });
};

// --- 3. お気に入りに追加する関数 ---
const addToFavorites = (track) => {
    if (favorites.length >= 10) {
        alert('お気に入りリストは10曲までです。');
        return;
    }
    if (favorites.some(fav => fav.id === track.id)) {
        alert('その曲は既にお気に入りに追加されています。');
        return;
    }

    favorites.push(track);
    renderFavorites();
    toggleAnalyzeButton();
};

const deleteFromFavorites = (trackToDelete) => {
    favorites = favorites.filter(track => track.id !== trackToDelete.id);
    renderFavorites();
    toggleAnalyzeButton();
};

const toggleAnalyzeButton = () => {
    if (favorites.length === 10) {
        analyzeBtn.style.display = 'inline-block';
    } else {
        analyzeBtn.style.display = 'none';
    }
};

const labelMap = {
    "ダンサビリティ_danceable": "ダンス向き",
    "性別_female": "女性ボーカル比率",
    "アコースティック_acoustic": "アコースティック度",
    "アグレッシブ_aggressive": "アグレッシブ度",
    "エレクトロニック_electronic": "エレクトロニック度",
    "ハッピー_happy": "ハッピー度",
    "パーティー_party": "パーティー向き",
    "リラックス_relaxed": "リラックス度",
    "サッド_sad": "サッド度",
    "音色_bright": "明るい音色度",
    "調性_atonal": "無調性度",
    "ボーカル/インスト_instrumental": "インスト比率"
};



function renderPreferenceVector(vector) {
    const analysisDiv = document.getElementById('analysisResults');
    analysisDiv.innerHTML = ''; // 分析結果だけ消す

    for (const [key, value] of Object.entries(vector)) {
        const container = document.createElement('div');
        container.className = 'slider-container';

        const label = document.createElement('label');
        label.innerText = labelMap[key] || key;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = 0;
        input.max = 100;     
        input.step = 1;
        input.value = value * 100;
        input.disabled = true; // ← ここで動かせないようにする

        const output = document.createElement('span');
        output.innerText = `${Math.round(value * 100)}%`;

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(output);

        analysisDiv.appendChild(container);
    }
}


let debounceTimer;
searchForm.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        performSearch(0); 
    }, 500);
});

nextBtn.addEventListener('click', () => {
    performSearch(currentOffset + limit);
});

prevBtn.addEventListener('click', () => {
    performSearch(currentOffset - limit);
});

analyzeBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(favorites)
        });
        const data = await response.json();
        console.log('Server response:', data);

        // Pythonの分析結果（preference_vector）の取得
        const preferenceVector = data.pythonResponse.preference_vector;

        // スライダーを表示
        renderPreferenceVector(preferenceVector);

    } catch (error) {
        console.error('Error sending favorites:', error);
        alert('送信に失敗しました。');
    }
});

        