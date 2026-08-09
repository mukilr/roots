import express from 'express';
import cors from 'cors';
import { peopleRouter } from './routes/people.js';
import { relationshipsRouter } from './routes/relationships.js';
import { treeRouter } from './routes/tree.js';
import { dataRouter } from './routes/data.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/people', peopleRouter);
app.use('/api/relationships', relationshipsRouter);
app.use('/api/tree', treeRouter);
app.use('/api/data', dataRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`familytree server listening on http://localhost:${PORT}`);
});
