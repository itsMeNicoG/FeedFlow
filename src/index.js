import { Hono } from 'hono';
import companies from './routes/companies.js';
import users from './routes/users.js';
import surveys from './routes/surveys.js';
import reports from './routes/reports.js';
import { submitResponse, webhookWhatsapp } from './controllers/responses.js';

const app = new Hono();

// Ruta de bienvenida para verificar que el servidor corre
app.get('/', (c) => {
  return c.json({ message: 'FeedFlow API is running! 🚀' });
});

// Conectar los módulos de rutas
app.route('/companies', companies);
app.route('/users', users);
app.route('/surveys', surveys);
app.route('/reports', reports);

// Rutas públicas para responder encuestas
app.post('/submit/:surveyId', submitResponse);
app.post('/webhook/whatsapp', webhookWhatsapp);

// Exportar la configuración para que Bun la ejecute
export default {
  port: 3000,
  fetch: app.fetch,
};

// Exportar app para tests
export { app };
