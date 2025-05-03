require("dotenv").config();

const { Pool } = require("pg");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4242;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/", async (_, res) => {
  const client = await pool.connect();
  const result = await client.query("SELECT version()");
  client.release();
  const { version } = result.rows[0];
  res.json({ version });
});

app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});

app.get("/:table", async (req, res) => {
  try {
    const result = await pool.query("Select * from $1", [req.params.table]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/:table/:col/:col_val", async (req, res) => {
  try {
    const result = await pool.query("Select * from $1 where $2='$3'", [
      req.params.table,
      req.params.col,
      req.params.col_val,
    ]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.post("/sets/new", async (req, res) => {
  const client = await pool.connect();

  try {
    const newSet = req.body;

    const set = newSet.set;
    const qna = newSet.qna;

    await client.query("BEGIN");

    const queryText =
      "INSERT INTO sets(set_id, title, description) VALUES($1, $2, $3)";
    await client.query(queryText, [set.id, set.title, set.description]);

    const insertQuestions =
      "INSERT INTO questions(question_index, set_id, question_text) VALUES ($1, $2, $3)";
    const insertAnswers =
      "INSERT INTO answers(answer_index, set_id, answer_text, is_correct) VALUES ($1, $2, $3, $4)";

    qna.forEach(async (qnaObj, index) => {
      await client.query(insertQuestions, [index + 1, set.id, qnaObj.question]);
      await client.query(insertAnswers, [
        index + 1,
        set.id,
        qnaObj.answer,
        false,
      ]);
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

module.exports = app;
