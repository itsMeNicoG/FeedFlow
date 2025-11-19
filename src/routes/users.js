import { Hono } from 'hono';
import { createUser } from '../controllers/users.js';

const app = new Hono();

// Definir la ruta POST /users
app.post('/', createUser);

export default app;
