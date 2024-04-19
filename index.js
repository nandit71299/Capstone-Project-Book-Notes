import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import { dirname } from "path";
import { URLSearchParams, fileURLToPath } from "url";
import axios from "axios";
import utf8 from "utf8";

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public/"));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "openlibrary",
    password: "root",
    port: 5432,
});

db.connect();

app.get('/', async (req, res) => {
    const dbResult = await db.query("SELECT * FROM notes ORDER BY id DESC");
    var data = dbResult.rows;
    var olid = dbResult.rows[0].id;

    for (let index = 0; index < data.length; index++) {
        var olid = data[index].olid;
        data[index].olid = "https://covers.openlibrary.org/b/olid/" + olid + "-L.jpg"
        console.log(data[index]);
    }

    res.render("index.ejs", {
        data: data
    });

});

app.get('/new', (req, res) => {
    res.render("new.ejs")
});

app.post('/search', async (req, res) => {
    var name = req.body.name;
    name = name.replace(" ", "+");
    try {

        var result = await axios.get("https://openlibrary.org/search.json?title=" + name);
        res.render("new.ejs", {
            data: result.data.docs
        });
    } catch (error) {
        console.log(error);
    }
});

app.post('/bookcover', async (req, res) => {
    var olid = req.body.olid;
    var title = req.body.title;
    console.log(olid);
    const dbResult = await db.query("SELECT * FROM notes WHERE olid = $1", [olid]);
    if (dbResult.rows.length > 0) {
        try {
            res.render("bookcover.ejs", {
                url: "https://covers.openlibrary.org/b/olid/" + olid + "-L.jpg",
                title: title,
                notes: dbResult.rows[0].notes,
            });
        } catch (error) {
            res.send("Duplicate Entries Not Allowed");
        }
    }
    else {
        try {
            res.render("bookcover.ejs", {
                url: "https://covers.openlibrary.org/b/olid/" + olid + "-L.jpg",
                title: title,
                olid: olid

            });
        } catch (error) {
            console.log(error);
        }
    }
});

app.post("/addnotes", async (req, res) => {
    const olid = req.body.olid;
    const title = req.body.title;
    const notes = req.body.notes;

    try {
        const result = await db.query("INSERT INTO notes (olid,title,notes) VALUES ($1,$2,$3) RETURNING *", [olid, title, notes]);
        res.redirect(308, "/bookcover")
        // next();
    }
    catch (error) {
        console.log(error);
    }

})

app.listen(port, () => {
    console.log("Application started on port number : " + port);
});