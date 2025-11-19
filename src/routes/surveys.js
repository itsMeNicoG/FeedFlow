import { Hono } from 'hono';
import { 
  createSurvey, 
  getSurveys, 
  getSurveyById, 
  deleteSurvey, 
  duplicateSurvey 
} from '../controllers/surveys.js';
import { addQuestion, deleteQuestion } from '../controllers/questions.js';

const app = new Hono();

app.post('/', createSurvey);
app.get('/', getSurveys);
app.get('/:id', getSurveyById);
app.delete('/:id', deleteSurvey);
app.post('/:id/duplicate', duplicateSurvey);

// Rutas de Preguntas (anidadas bajo la encuesta)
app.post('/:id/questions', addQuestion);
app.delete('/:id/questions/:questionId', deleteQuestion);

export default app;
