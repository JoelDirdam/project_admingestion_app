-- Create database for Panadería La Paz
-- Run this script as a PostgreSQL superuser

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE panaderia_la_paz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'panaderia_la_paz')\gexec

-- Note: Prisma migrations will handle schema creation
-- This script is for initial database setup only


