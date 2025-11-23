import { Hono } from 'hono';
import companies from './routes/companies.js';
import users from './routes/users.js';
import surveys from './routes/surveys.js';
import reports from './routes/reports.js';
import auth from './routes/auth.js';
import { submitResponse, webhookWhatsapp } from './controllers/responses.js';
import { getSurveyBySlug } from './controllers/surveys.js';
import { authMiddleware, checkUserActive } from './middleware/auth.js';

const app = new Hono();

// Ruta de bienvenida para verificar que el servidor corre
app.get('/', (c) => {
  return c.json({ message: 'FeedFlow API is running! 🚀' });
});

// Rutas Públicas (No requieren login)
app.route('/auth', auth); // Login
app.get('/s/:slug', getSurveyBySlug); // Acceso por link corto
app.post('/submit/:surveyId', submitResponse); // Responder encuesta
app.post('/webhook/whatsapp', webhookWhatsapp); // Webhook

// Rutas Protegidas (Requieren Token + Usuario Activo)
// Aplicamos el middleware a todas las rutas que definamos debajo de esto
app.use('/companies/*', authMiddleware, checkUserActive);
app.use('/users/*', authMiddleware, checkUserActive);
app.use('/surveys/*', authMiddleware, checkUserActive);
app.use('/reports/*', authMiddleware, checkUserActive);

// Conectar los módulos de rutas protegidas
app.route('/companies', companies);
app.route('/users', users);
app.route('/surveys', surveys);
app.route('/reports', reports);

/**
 * Server port configuration
 * @type {number}
 * @description Loaded from PORT environment variable, defaults to 3000
 */
const PORT = parseInt(process.env.PORT || "3000", 10);

// Exportar la configuración para que Bun la ejecute
export default {
  port: PORT,
  fetch: app.fetch,
};

// Exportar app para tests
export { app };
