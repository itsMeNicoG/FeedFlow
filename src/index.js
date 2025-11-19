import { Hono } from 'hono';
import companies from './routes/companies.js';
import users from './routes/users.js';

const app = new Hono();

// Ruta de bienvenida para verificar que el servidor corre
app.get('/', (c) => {
  return c.json({ message: 'FeedFlow API is running! 🚀' });
});

// Conectar los módulos de rutas
app.route('/companies', companies);
app.route('/users', users);

// Exportar la configuración para que Bun la ejecute
export default {
  port: 3000,
  fetch: app.fetch,
};
