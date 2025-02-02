const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());


const db = new sqlite3.Database('./time_tracking.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the time tracking database.');
});


db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    time DATETIME NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

// API endpoints
app.get('/api/entries', (req, res) => {
  db.all('SELECT * FROM time_entries ORDER BY time DESC', (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/canstart/:id', (req, res) => {
  //TOOD: get first entry order by time and user_id = id, and if type == "START" return false
  const userId = req.params.id;

  //TODO: CHECK IF USER EXISTS I GUESS?
  db.get(
    `SELECT type FROM time_entries WHERE user_id = ? ORDER BY time DESC LIMIT 1`,
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const canStart = !row || row.type === "STOP"; // Only allow if last entry is STOP or doesn't exist
      res.json({ canStart });
    }
  );
})




app.get('/api/entries/:id', (req, res) => {
  const userId = req.params.id;

  db.all('SELECT * FROM time_entries WHERE user_id = ? ORDER BY time DESC',
    [userId],
    (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
});


app.post('/api/entries/:id', (req, res) => {
  const { time, type } = req.body;
  db.run(
    'INSERT INTO time_entries (user_id, time, type) VALUES (?, ?, ?)',
    [req.params.id, time, type],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});


app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
}
)

app.get('/api/sessions/:id', (req, res) => {
  const user_id = req.params.id;

  const query =
    `--sql
    SELECT 
      s1.user_id, 
      u.username, 
      s1.time AS start_time, 
      s2.time AS stop_time
    FROM time_entries s1
    JOIN time_entries s2 
      ON s1.user_id = s2.user_id 
      AND s1.type = 'START' 
      AND s2.type = 'STOP' 
      AND s2.time > s1.time
    JOIN users u ON u.id = s1.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM time_entries s3 
        WHERE s3.user_id = s1.user_id 
        AND s3.type = 'START' 
        AND s3.time > s1.time 
        AND s3.time < s2.time
      )
    AND u.id = ?
    ORDER BY s1.user_id, s1.time;        
  `
  db.all(query, [user_id], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    res.json(rows);
  });
})


app.get('/api/sessions', (req, res) => {
  const query =
    `--sql
    SELECT 
      s1.user_id, 
      u.username, 
      s1.time AS start_time, 
      s2.time AS stop_time
    FROM time_entries s1
    JOIN time_entries s2 
      ON s1.user_id = s2.user_id 
      AND s1.type = 'START' 
      AND s2.type = 'STOP' 
      AND s2.time > s1.time
    JOIN users u ON u.id = s1.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM time_entries s3 
        WHERE s3.user_id = s1.user_id 
        AND s3.type = 'START' 
        AND s3.time > s1.time 
        AND s3.time < s2.time
      )
    ORDER BY s1.user_id, s1.time;        
  `
  db.all(query, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    res.json(rows);
  });
})


app.get('/api/online', (req, res) => {
  const query =
    `--sql
  WITH online_tbl AS (
    SELECT user_id, type, time,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY time DESC) AS rn
    FROM time_entries
  )
  SELECT 
    users.id, 
    users.username,
    online_tbl.time,
    CASE 
      WHEN online_tbl.type = 'START' THEN true
      WHEN online_tbl.type = 'STOP' THEN false
      ELSE null
    END AS online
  FROM users
  LEFT JOIN online_tbl 
    ON online_tbl.user_id = users.id 
    AND online_tbl.rn = 1;
  `

  db.all(query, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
}
)




//this is probably nuot needed
app.delete('/api/entries/:id', (req, res) => {
  db.run('DELETE FROM time_entries WHERE id = ?', req.params.id, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});