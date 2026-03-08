"""One-time script to create the builds table in Supabase."""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Supabase exposes a Postgres connection string
# Format: postgresql://postgres.[ref]:[password]@[host]:5432/postgres
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
ref = SUPABASE_URL.split("//")[1].split(".")[0] if "//" in SUPABASE_URL else ""

# Try direct connection via Supabase's pooler
# You may need to set DATABASE_URL in .env instead
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL:
    print("DATABASE_URL not set in .env")
    print("Please add it from Supabase Dashboard -> Settings -> Database -> Connection string (URI)")
    print("")
    print("Or run this SQL manually in the Supabase SQL Editor:")
    print("")
    print("""CREATE TABLE IF NOT EXISTS public.builds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT,
    image_url TEXT NOT NULL,
    model_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);""")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS public.builds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT,
    image_url TEXT NOT NULL,
    model_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
""")

print("builds table created successfully!")
cur.close()
conn.close()
