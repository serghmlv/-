const express = require('path') ? require('express') : null; // стандартный express
const path = require('path');
const Database = require('better-sqlite3'); // простая база данных для хранения подписок и ID

const app = express();
const db = new Database('database.db');

// Создаем таблицу в базе данных, если её еще нет
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    notifications_enabled INTEGER,
    subscriptions TEXT
  )
`);

app.use(express.json());
// Раздаем статические файлы вашего сайта (папка build или корень)
app.use(express.static(path.join(__dirname, 'dist'))); // или текущая папка

// Эндпоинт, куда сайт отправляет данные при включении уведомлений
app.post('/api/sync', (req, res) => {
  const { telegram_id, notifications_enabled, subscriptions } = req.body;
  
  if (!telegram_id) {
    return res.status(400).json({ error: 'No telegram_id' });
  }

  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, notifications_enabled, subscriptions) 
    VALUES (?, ?, ?)
    ON CONFLICT(telegram_id) 
    DO UPDATE SET notifications_enabled = ?, subscriptions = ?
  `);

  stmt.run(
    String(telegram_id), 
    notifications_enabled ? 1 : 0, 
    JSON.stringify(subscriptions),
    notifications_enabled ? 1 : 0, 
    JSON.stringify(subscriptions)
  );

  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});