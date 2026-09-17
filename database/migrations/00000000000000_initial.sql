-- Baseline ejecutable exclusivamente con psql.
-- Conserva el snapshot revisado mientras se introducen migraciones incrementales.
-- Ejemplo: psql -h 127.0.0.1 -U postgres -d postgres -f database/migrations/00000000000000_initial.sql
\ir ../../turismo_vinculacion_app.sql
