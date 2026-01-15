const express = require("express");

const app = express();

app.get("/omdb", async (req, res) => {
    const title = req.query.t;
    const url = `http://www.omdbapi.com/?apikey=1152eaef&t=${encodeURIComponent(title)}`;

    try {
        const r = await fetch(url);        
        const data = await r.text();
        res.set("Access-Control-Allow-Origin", "*");
        res.send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send("OMDb failed");
    }
});

app.listen(3000, () => {
    console.log("OMDb proxy running on http://localhost:3000");
});