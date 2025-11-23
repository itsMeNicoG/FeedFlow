/**
 * @fileoverview Database connection manager
 * @module db/connection
 * @description
 * Provides a singleton SQLite database connection.
 * Automatically switches to test database when NODE_ENV=test.
 * Database path can be configured via DB_PATH environment variable.
 */

import { Database } from "bun:sqlite";

/**
 * Determines which database file to use based on environment
 * @type {boolean}
 */
const isTest = process.env.NODE_ENV === 'test';

/**
 * Database filename from environment or defaults
 * @type {string}
 * @description
 * - Test mode: Uses "feedflow_test.sqlite"
 * - Production/Dev: Uses DB_PATH from .env or defaults to "feedflow.sqlite"
 */
const dbName = isTest 
  ? "feedflow_test.sqlite" 
  : (process.env.DB_PATH || "feedflow.sqlite");

/**
 * Shared SQLite database connection
 * @type {Database}
 * @see {@link https://bun.sh/docs/api/sqlite}
 */
export const db = new Database(dbName);

/**
 * Enable foreign key constraints
 * @description SQLite disables foreign keys by default - must be enabled per connection
 */
db.run("PRAGMA foreign_keys = ON;");
