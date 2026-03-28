-- Enable pg_trgm for full-text similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
