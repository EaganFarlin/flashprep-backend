const client = require("./connection.js");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.listen(3300, () => {
  console.log("CORS-enabled web server listening at port 3300");
});

client.connect();

app.get("/:table", (req, res) => {
  client.query(`Select * from ${req.params.table}`, (err, result) => {
    if (!err) {
      res.send(result.rows);
    }
  });
  client.end;
});

app.get("/:table/:col/:col_val", (req, res) => {
  client.query(
    `Select * from ${req.params.table} where ${req.params.col}='${req.params.col_val}'`,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      }
    },
  );
  client.end;
});

app.post("/sets/new", async (req, res) => {
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
    client.release;
  }
});
