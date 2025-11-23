/**
 * @fileoverview Survey and question management routes with RBAC
 * @module routes/surveys
 * @description
 * Role-based access:
 * - GET routes: Accessible to all authenticated users
 * - POST/PUT/DELETE routes: Restricted to 'creator' role only
 */

import { Hono } from 'hono';
import { 
  createSurvey, 
  getSurveys, 
  getSurveyById,
  updateSurvey, 
  deleteSurvey, 
  duplicateSurvey 
} from '../controllers/surveys.js';
import { addQuestion, deleteQuestion } from '../controllers/questions.js';
import { requireRole } from '../middleware/auth.js';

const app = new Hono();

/**
 * GET /surveys - List all surveys for a company
 * @query {number} company_id - Required
 */
app.get('/', getSurveys);

/**
 * GET /surveys/:id - Get survey details with questions and options
 * @param {number} id - Survey ID
 */
app.get('/:id', getSurveyById);

/**
 * POST /surveys - Create a new survey
 * @access creator role only
 */
app.post('/', requireRole('creator'), createSurvey);

/**
 * PUT /surveys/:id - Update survey metadata
 * @access creator role only
 */
app.put('/:id', requireRole('creator'), updateSurvey);

/**
 * DELETE /surveys/:id - Delete survey and all related data
 * @access creator role only
 */
app.delete('/:id', requireRole('creator'), deleteSurvey);

/**
 * POST /surveys/:id/duplicate - Duplicate survey with questions
 * @access creator role only
 */
app.post('/:id/duplicate', requireRole('creator'), duplicateSurvey);

/**
 * POST /surveys/:id/questions - Add question to survey
 * @access creator role only
 */
app.post('/:id/questions', requireRole('creator'), addQuestion);

/**
 * DELETE /surveys/:id/questions/:questionId - Remove question from survey
 * @access creator role only
 */
app.delete('/:id/questions/:questionId', requireRole('creator'), deleteQuestion);

export default app;
