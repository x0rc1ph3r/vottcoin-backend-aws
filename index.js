import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import auth from './routes/auth.js'
dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json())

// Available Routes
app.use('/api', auth)

app.get('/hcksbcowk', function(req,res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`)
})
