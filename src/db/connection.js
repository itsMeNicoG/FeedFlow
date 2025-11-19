import { Database } from "bun:sqlite";

// Si la variable de entorno NODE_ENV es 'test', usamos la base de datos de prueba
const isTest = process.env.NODE_ENV === 'test';
const dbName = isTest ? "feedflow_test.sqlite" : "feedflow.sqlite";

export const db = new Database(dbName);

// Asegurar que las foreign keys funcionen siempre
db.run("PRAGMA foreign_keys = ON;");
