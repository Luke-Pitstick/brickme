# BrickMe

Turn images into LEGO-style 3D models. Upload a photo, and BrickMe converts it to a brickified 3D model you can view and save.

## Prerequisites

- **Node.js** 18+ (for the frontend)
- **Python** 3.10+ (for the backend)
- **Redis** (must be running locally for image-to-3D job tracking)
- **Meshy API key** (for 3D conversion; [get one at Meshy](https://www.meshy.ai/))

## Running the Backend

1. **Create and activate a virtual environment:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r ../requirements.txt
   pip install fastapi uvicorn redis pydantic supabase psycopg2-binary
   ```

3. **Create a `.env` file** in the `backend/` directory:
   ```
   MESHY_API_KEY=your_meshy_api_key_here
   ```

   Optional (for Supabase storage and database):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_supabase_anon_key
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

4. **Start Redis** (if not already running):
   ```bash
   redis-server
   ```

5. **Run the API server:**
   ```bash
   python run.py
   ```
   The backend will be available at **http://localhost:8000**

## Running the Frontend

1. **Install dependencies:**
   ```bash
   cd frontend/brickme
   npm install
   ```

2. **Create a `.env.local` file** in `frontend/brickme/` (optional—defaults work for local dev):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
   Use this if your backend runs on a different host or port.

3. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

   Or build and run in production:
   ```bash
   npm run build
   npm run start
   ```
   Use `npm run start -- -p 4000` to run on port 4000.

## API Keys & Environment Variables

| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| `MESHY_API_KEY` | `backend/.env` | Yes (for 3D conversion) | API key from [Meshy](https://www.meshy.ai/) for image-to-3D |
| `SUPABASE_URL` | `backend/.env` | No | Supabase project URL (for cloud storage) |
| `SUPABASE_KEY` | `backend/.env` | No | Supabase anon key (for cloud storage) |
| `DATABASE_URL` | `backend/.env` | No | PostgreSQL connection string (for `create_builds_table.py`) |
| `NEXT_PUBLIC_API_URL` | `frontend/brickme/.env.local` | No | Backend API URL (default: `http://localhost:8000`) |

**Backend `.env`:** Create `backend/.env` with your keys. Do not commit this file.

**Frontend `.env.local`:** Create `frontend/brickme/.env.local` if you need to point to a different API URL. Do not commit this file.

Without `MESHY_API_KEY`, the backend falls back to a demo 3D model instead of converting images.

## Project Structure

```
brickme/
├── backend/           # FastAPI API (port 8000)
│   ├── src/
│   │   ├── api/       # API routes
│   │   ├── connections/  # Meshy, Redis, Supabase
│   │   └── three_d/   # Lego pipeline, point cloud
│   ├── data/          # builds.json (local storage)
│   ├── output/        # Generated models
│   └── run.py
├── frontend/brickme/  # Next.js app (port 3000)
│   ├── app/
│   ├── components/
│   └── lib/
└── requirements.txt
```
