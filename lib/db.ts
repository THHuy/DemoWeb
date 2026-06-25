// Re-export pool from server for any shared usage
// The actual database connection is managed by the Express server in server/db.ts
// This file exists so lib/db-schema.sql can be referenced from the project root

export {};
