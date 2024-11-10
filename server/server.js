const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const axios = require('axios'); // Подключаем axios для загрузки данных
const app = express();
const port = 3000;

app.use(cors()); // Разрешаем запросы с разных источников
app.use(express.json()); // Для обработки JSON в теле запроса

// Настройка WebSocket
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('Received:', message);
    // Пример отправки прогресса клиенту
    ws.send(JSON.stringify({ progress: 50 })); // Прогресс загрузки 50%
  });
});

// Заглушка для URL по ключевому слову
const data = {
  "keyword1": ["https://example.com/file1", "https://example.com/file2"],
  "keyword2": ["https://example.com/file3"]
};

// Эндпоинт для поиска URL по ключевому слову
app.get('/get-urls/:keyword', (req, res) => {
  const keyword = req.params.keyword;
  const urls = data[keyword];

  // Проверка, если нет URL по ключевому слову
  if (!urls) {
    return res.status(404).json({ message: `No URLs found for keyword: ${keyword}` });
  }

  res.json(urls);
});

// Обработка ошибок на сервере
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong on the server!' });
});

// Запуск сервера с WebSocket
app.server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Обработчик WebSocket
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Функция для загрузки данных с URL (имитация)
async function downloadData(url, ws, total, index) {
  try {
    console.log(`Downloading: ${url}`);
    // Симуляция задержки (например, 2 секунды)
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Downloaded: ${url}`);

    // Отправка прогресса после загрузки одного файла
    const progress = Math.round(((index + 1) / total) * 100);
    ws.send(JSON.stringify({ progress }));

    return url;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    throw new Error(`Error downloading ${url}`);
  }
}

// Обработчик запросов с параллельной загрузкой
app.get('/download-urls/:keyword', async (req, res) => {
  const keyword = req.params.keyword;
  const urls = data[keyword];

  if (!urls) {
    return res.status(404).json({ message: `No URLs found for keyword: ${keyword}` });
  }

  // Создайте WebSocket для отслеживания прогресса
  const ws = new WebSocket('ws://localhost:3000');

  // Используем Promise.all для параллельной загрузки и прогресса
  try {
    const total = urls.length;
    const results = await Promise.all(urls.map((url, index) => downloadData(url, ws, total, index)));
    res.json({ message: 'All URLs downloaded successfully', results });
  } catch (error) {
    res.status(500).json({ message: 'Error during downloading', error: error.message });
  }
});
