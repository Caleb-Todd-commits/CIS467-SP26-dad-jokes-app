import express, { Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";
import fs from "fs";

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
function readSecret(name: string): string | undefined {
  const secretFile = process.env[`${name}_FILE`];

  if (!secretFile) {
    return process.env[name];
  }

  try {
    return fs.readFileSync(secretFile, "utf8").trim();
  } catch (err) {
    console.warn(`Could not read secret file for ${name}:`, err);
    return process.env[name];
  }
}

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "dadjokes",
  password: readSecret("DB_PASSWORD") || "dadjokes",
  database: process.env.DB_NAME || "dadjokes",
});

// Simple retry loop – the API container often starts before Postgres is ready.
async function waitForDb(retries = 10, delay = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connection established");
      return;
    } catch (err) {
      console.log(
        `⏳ Waiting for database... attempt ${i + 1}/${retries}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Could not connect to database after multiple attempts");
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// --- Health check --------------------------------------------------------
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", database: "connected" });
  } catch {
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

// --- GET /api/jokes – list all (optional ?category= filter) ---------------
app.get("/api/jokes", async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let result;
    if (category) {
      result = await pool.query(
        "SELECT * FROM jokes WHERE category = $1 ORDER BY id",
        [category]
      );
    } else {
      result = await pool.query("SELECT * FROM jokes ORDER BY id");
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching jokes:", err);
    res.status(500).json({ error: "Failed to fetch jokes" });
  }
});

// --- GET /api/jokes/random – one random joke ------------------------------
app.get("/api/jokes/random", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "UPDATE jokes SET times_told = times_told + 1 WHERE id = (SELECT id FROM jokes ORDER BY RANDOM() LIMIT 1) RETURNING *"
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching random joke:", err);
    res.status(500).json({ error: "Failed to fetch random joke" });
  }
});

// --- GET /api/jokes/:id ---------------------------------------------------
app.get("/api/jokes/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM jokes WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Joke not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching joke:", err);
    res.status(500).json({ error: "Failed to fetch joke" });
  }
});

// --- POST /api/jokes – create a new joke ----------------------------------
app.post("/api/jokes", async (req: Request, res: Response) => {
  try {
    const { setup, punchline, category } = req.body;
    if (!setup || !punchline) {
      res.status(400).json({ error: "setup and punchline are required" });
      return;
    }
    const result = await pool.query(
      "INSERT INTO jokes (setup, punchline, category) VALUES ($1, $2, $3) RETURNING *",
      [setup, punchline, category || "general"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating joke:", err);
    res.status(500).json({ error: "Failed to create joke" });
  }
});

// --- PATCH /api/jokes/:id/rate – rate a joke ------------------------------
app.patch("/api/jokes/:id/rate", async (req: Request, res: Response) => {
  try {
    const { rating } = req.body;
    if (rating === undefined || rating < 0 || rating > 5) {
      res.status(400).json({ error: "rating must be between 0 and 5" });
      return;
    }
    const result = await pool.query(
      "UPDATE jokes SET rating = $1 WHERE id = $2 RETURNING *",
      [rating, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Joke not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error rating joke:", err);
    res.status(500).json({ error: "Failed to rate joke" });
  }
});

// --- DELETE /api/jokes/:id ------------------------------------------------
app.delete("/api/jokes/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "DELETE FROM jokes WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Joke not found" });
      return;
    }
    res.json({ message: "Joke deleted", joke: result.rows[0] });
  } catch (err) {
    console.error("Error deleting joke:", err);
    res.status(500).json({ error: "Failed to delete joke" });
  }
});

// --- GET /api/categories – distinct categories ----------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM jokes ORDER BY category"
    );
    res.json(result.rows.map((r: { category: string }) => r.category));
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// --- GET /api/stats – dashboard summary -----------------------------------
app.get("/api/stats", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_jokes,
        COUNT(DISTINCT category)::int AS total_categories,
        COALESCE(ROUND(AVG(rating), 2), 0)::float AS average_rating,
        COALESCE(SUM(times_told), 0)::int AS total_times_told,
        (
          SELECT setup
          FROM jokes
          ORDER BY rating DESC, times_told DESC, id
          LIMIT 1
        ) AS top_rated_setup,
        (
          SELECT setup
          FROM jokes
          ORDER BY times_told DESC, rating DESC, id
          LIMIT 1
        ) AS most_told_setup
      FROM jokes
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
async function main() {
  await waitForDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🃏 Dad Jokes API running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
