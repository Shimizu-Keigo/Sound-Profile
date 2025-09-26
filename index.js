const express = require("express")
const app = express();
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const mailAdress = process.env.APP_MAIL;
const appName = process.env.APP_NAME;
const pyUrl = process.env.PY_URL;

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', async (req, res) => {
    res.render("home.ejs")
})

app.get('/search', async (req, res) => {
    const artist = req.query.artist || "";
    const title = req.query.title || "";
    const offset = parseInt(req.query.offset) || 0;
    const limit = 10;

   if(!artist && !title) {
    return res.status(400).json({ error: "曲名かアーティスト名を入力してください"});
   }

   let query = '';
   if (artist) query += `artist:${artist}`;
   if (title) query += (query ? ' AND ' : '') + `recording:${title}`;

    try {
        const mbUrl = "https://musicbrainz.org/ws/2/recording";
        const mbRes = await axios.get(mbUrl, {
            params: {
                query: query,
                fmt: "json",
                limit: limit,
                offset: offset,
            },
            headers: { "User-Agent": `${appName} (${mailAdress})` },
        });
        const recordings = mbRes.data.recordings || [];
        const totalResults = mbRes.data.count || 0;

        const tracks = await Promise.all(
            recordings.map(async (rec) => {
                const title = rec.title;
                const artist = rec["artist-credit"]?.map( a => a.name).join(", ") || "Unknown";
                const id = rec.id;

                let image = "/default-cover.jpg";
                if(rec.releases && rec.releases.length > 0) {
                    const releaseId = rec.releases[0].id;
                    const coverUrl = `https://coverartarchive.org/release/${releaseId}/front-250`;
                    try {
                        await axios.get(coverUrl);
                        image = coverUrl;
                    } catch {}
                }

                return { id, name: title, artist, image };
            })
        );

        res.json({ tracks, total: totalResults });
    } catch(error) {
        console.error("Error fetching MusicBrainz", error.message);
        res.status(500).json({ error: "Failed to search tracks" });
    }
});

app.post("/favorites", async (req, res) => {
    const favorites = req.body;

    try {
        const pyRes = await axios.post(pyUrl, favorites);
        const preferenceVector = pyRes.data; 
        console.log("preference_vector:", preferenceVector);
        res.json({ status: "ok", pythonResponse: pyRes.data });
    } catch (error) {
        console.error("Error sending to Python:", error.message);
        res.status(500).json({ error: "Failed to send to Python"})
    }
});




app.listen(3000, () => {
    console.log('ポート3000でリクエスト待受中')
});