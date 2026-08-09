import { Router } from 'express';
import * as store from '../store.js';

export const peopleRouter = Router();

peopleRouter.get('/', (req, res) => {
  res.json(store.getAllPeople());
});

peopleRouter.get('/:id', (req, res) => {
  const person = store.getPerson(req.params.id);
  if (!person) return res.status(404).json({ error: 'Person not found' });
  res.json(person);
});

peopleRouter.post('/', (req, res) => {
  const { firstName, gender } = req.body;
  if (!firstName) {
    return res.status(400).json({ error: 'firstName is required' });
  }
  if (gender && !['male', 'female'].includes(gender)) {
    return res.status(400).json({ error: "gender must be 'male' or 'female'" });
  }
  const person = store.createPerson(req.body);
  res.status(201).json(person);
});

peopleRouter.put('/:id', (req, res) => {
  const person = store.updatePerson(req.params.id, req.body);
  if (!person) return res.status(404).json({ error: 'Person not found' });
  res.json(person);
});

peopleRouter.delete('/:id', (req, res) => {
  const ok = store.deletePerson(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Person not found' });
  res.status(204).end();
});
