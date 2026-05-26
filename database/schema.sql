-- South African ID Number based schema
-- The sa_id is the primary key (13-digit South African ID number)
-- We store the extracted birth date separately for easier querying

CREATE TABLE IF NOT EXISTS people (
    sa_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    surname TEXT NOT NULL,
    birth_date TEXT NOT NULL, -- ISO format (YYYY-MM-DD)
    gender TEXT, -- 'Male' or 'Female'
    is_sa_citizen INTEGER DEFAULT 1 -- 1 for SA citizen, 0 for non-citizen
);
