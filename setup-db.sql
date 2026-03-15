-- Run this as a PostgreSQL superuser (postgres):
--   psql -U postgres -f setup-db.sql

-- Create the database
CREATE DATABASE qa_analyzer;

-- Optional: create a dedicated app user (recommended for production)
-- Replace 'your_password' with a real password, then update .env accordingly
-- CREATE USER qa_user WITH PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON DATABASE qa_analyzer TO qa_user;

\c qa_analyzer

-- Allow uuid generation (needed by migrate.js)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\echo '✓ Database qa_analyzer created successfully'
\echo '  Now run: cd backend && node src/db/migrate.js'
