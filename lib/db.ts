import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder');
