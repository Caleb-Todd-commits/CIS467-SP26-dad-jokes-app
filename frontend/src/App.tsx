import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Joke {
  id: number;
  setup: string;
  punchline: string;
  category: string;
  rating: number;
  times_told: number;
}

interface JokeStats {
  total_jokes: number;
  total_categories: number;
  average_rating: number;
  total_times_told: number;
  top_rated_setup: string | null;
  most_told_setup: string | null;
}

// ---------------------------------------------------------------------------
// API helper – in production the nginx proxy routes /api to the backend.
// ---------------------------------------------------------------------------
const API_BASE = "/api";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [joke, setJoke] = useState<Joke | null>(null);
  const [allJokes, setAllJokes] = useState<Joke[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showPunchline, setShowPunchline] = useState(false);
  const [view, setView] = useState<"random" | "browse" | "add">("random");
  const [loading, setLoading] = useState(false);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [stats, setStats] = useState<JokeStats | null>(null);

  // --- New joke form state ---
  const [newSetup, setNewSetup] = useState("");
  const [newPunchline, setNewPunchline] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  // --- Health check ---
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, []);

  // --- Load categories ---
  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  // --- Load joke stats ---
  const fetchStats = useCallback(() => {
    fetch(`${API_BASE}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // --- Fetch random joke ---
  const fetchRandom = useCallback(() => {
    setLoading(true);
    setShowPunchline(false);
    fetch(`${API_BASE}/jokes/random`)
      .then((r) => r.json())
      .then((j) => {
        setJoke(j);
        fetchStats();
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchStats]);

  // --- Fetch all jokes (optionally filtered) ---
  const fetchAll = useCallback(() => {
    const url = selectedCategory
      ? `${API_BASE}/jokes?category=${selectedCategory}`
      : `${API_BASE}/jokes`;
    fetch(url)
      .then((r) => r.json())
      .then(setAllJokes)
      .catch(console.error);
  }, [selectedCategory]);

  useEffect(() => {
    if (view === "browse") fetchAll();
  }, [view, fetchAll]);

  // --- Submit new joke ---
  const handleSubmit = () => {
    if (!newSetup.trim() || !newPunchline.trim()) return;
    fetch(`${API_BASE}/jokes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setup: newSetup,
        punchline: newPunchline,
        category: newCategory,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setNewSetup("");
        setNewPunchline("");
        setNewCategory("general");
        fetchStats();
        alert("Joke added! You're officially a dad.");
      })
      .catch(console.error);
  };

  // --- Rate a joke ---
  const rateJoke = (id: number, rating: number) => {
    fetch(`${API_BASE}/jokes/${id}/rate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    })
      .then((r) => r.json())
      .then(() => {
        if (view === "browse") fetchAll();
        if (joke && joke.id === id) setJoke({ ...joke, rating });
        fetchStats();
      })
      .catch(console.error);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>
          🧔 Dad Jokes Central 🧔
        </h1>
        <p style={styles.subtitle}>
          Where every joke is a groan-er
        </p>
        <div style={styles.statusDot}>
          <span
            style={{
              ...styles.dot,
              backgroundColor:
                healthy === null ? "#999" : healthy ? "#4ade80" : "#f87171",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
            API {healthy === null ? "checking…" : healthy ? "connected" : "offline"}
          </span>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        {(["random", "browse", "add"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              ...styles.navBtn,
              ...(view === v ? styles.navBtnActive : {}),
            }}
          >
            {v === "random" ? "🎲 Random" : v === "browse" ? "📖 Browse" : "✏️ Add"}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {stats && (
          <section style={styles.statsPanel} aria-label="Joke collection stats">
            <div style={styles.statBox}>
              <span style={styles.statValue}>{stats.total_jokes}</span>
              <span style={styles.statLabel}>Jokes</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statValue}>{stats.total_categories}</span>
              <span style={styles.statLabel}>Categories</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statValue}>{Number(stats.average_rating).toFixed(1)}</span>
              <span style={styles.statLabel}>Avg Rating</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statValue}>{stats.total_times_told}</span>
              <span style={styles.statLabel}>Tell Count</span>
            </div>
          </section>
        )}

        {/* ---- RANDOM VIEW ---- */}
        {view === "random" && (
          <div style={styles.card}>
            {joke ? (
              <>
                <p style={styles.setup}>{joke.setup}</p>
                {showPunchline ? (
                  <p style={styles.punchline}>{joke.punchline}</p>
                ) : (
                  <button
                    style={styles.revealBtn}
                    onClick={() => setShowPunchline(true)}
                  >
                    Show Punchline 👀
                  </button>
                )}
                <div style={styles.meta}>
                  <span style={styles.badge}>{joke.category}</span>
                  <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
                    Told {joke.times_told} time{joke.times_told !== 1 && "s"}
                  </span>
                </div>
                {showPunchline && (
                  <div style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => rateJoke(joke.id, n)}
                        style={{
                          ...styles.star,
                          color: n <= joke.rating ? "#facc15" : "#555",
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: "#aaa" }}>Hit the button to get a joke!</p>
            )}
            <button
              style={styles.primaryBtn}
              onClick={fetchRandom}
              disabled={loading}
            >
              {loading ? "Loading…" : joke ? "Another One! 🔄" : "Get a Joke 🎲"}
            </button>
          </div>
        )}

        {/* ---- BROWSE VIEW ---- */}
        {view === "browse" && (
          <div>
            <div style={styles.filterRow}>
              <label style={{ color: "#ccc" }}>Filter: </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={styles.select}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {allJokes.map((j) => (
              <div key={j.id} style={styles.listCard}>
                <p style={styles.setup}>{j.setup}</p>
                <p style={styles.punchline}>{j.punchline}</p>
                <div style={styles.meta}>
                  <span style={styles.badge}>{j.category}</span>
                  <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
                    ★ {Number(j.rating).toFixed(1)} · Told {j.times_told}×
                  </span>
                </div>
              </div>
            ))}
            {allJokes.length === 0 && (
              <p style={{ color: "#aaa", textAlign: "center" }}>No jokes found.</p>
            )}
            {stats && (stats.top_rated_setup || stats.most_told_setup) && (
              <div style={styles.insightPanel}>
                {stats.top_rated_setup && (
                  <p style={styles.insightText}>
                    <strong>Top rated:</strong> {stats.top_rated_setup}
                  </p>
                )}
                {stats.most_told_setup && (
                  <p style={styles.insightText}>
                    <strong>Most told:</strong> {stats.most_told_setup}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- ADD VIEW ---- */}
        {view === "add" && (
          <div style={styles.card}>
            <h2 style={{ color: "#facc15", marginBottom: "1rem" }}>
              Submit a Dad Joke
            </h2>
            <input
              placeholder="Setup… e.g. Why did the chicken…"
              value={newSetup}
              onChange={(e) => setNewSetup(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Punchline… e.g. To get to the other side!"
              value={newPunchline}
              onChange={(e) => setNewPunchline(e.target.value)}
              style={styles.input}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={styles.select}
            >
              {["general", "science", "food", "animals", "tech", "work", "nature", "sports"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
            <button style={styles.primaryBtn} onClick={handleSubmit}>
              Submit Joke 🚀
            </button>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Dad Jokes Central · Dockerized with ❤️ · Express + React + PostgreSQL</p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (keeps this a single-file component – no extra CSS needed)
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#eee",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: 0,
    padding: 0,
  },
  header: {
    textAlign: "center",
    padding: "2rem 1rem 1rem",
  },
  title: {
    fontSize: "2.2rem",
    margin: 0,
    color: "#facc15",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    color: "#94a3b8",
    fontStyle: "italic",
  },
  statusDot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    marginTop: "0.5rem",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  nav: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  },
  navBtn: {
    padding: "0.5rem 1.2rem",
    border: "1px solid #334155",
    borderRadius: "9999px",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  navBtnActive: {
    background: "#facc15",
    color: "#1a1a2e",
    borderColor: "#facc15",
    fontWeight: 600,
  },
  main: {
    width: "100%",
    maxWidth: 560,
    padding: "0 1rem",
    flex: 1,
  },
  statsPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  statBox: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "0.75rem 0.4rem",
    textAlign: "center",
    minWidth: 0,
  },
  statValue: {
    display: "block",
    color: "#facc15",
    fontSize: "1.15rem",
    fontWeight: 700,
  },
  statLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: "0.7rem",
    marginTop: "0.15rem",
  },
  card: {
    background: "#16213e",
    borderRadius: 12,
    padding: "2rem",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  listCard: {
    background: "#16213e",
    borderRadius: 10,
    padding: "1.2rem",
    marginBottom: "0.75rem",
  },
  setup: {
    fontSize: "1.15rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  },
  punchline: {
    fontSize: "1.05rem",
    color: "#facc15",
    fontStyle: "italic",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "0.75rem",
  },
  badge: {
    background: "#334155",
    color: "#94a3b8",
    padding: "0.15rem 0.6rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    textTransform: "capitalize" as const,
  },
  revealBtn: {
    padding: "0.6rem 1.5rem",
    border: "2px dashed #facc15",
    borderRadius: 8,
    background: "transparent",
    color: "#facc15",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  primaryBtn: {
    marginTop: "1.5rem",
    padding: "0.7rem 2rem",
    border: "none",
    borderRadius: 8,
    background: "#facc15",
    color: "#1a1a2e",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
  },
  ratingRow: {
    marginTop: "0.75rem",
    display: "flex",
    justifyContent: "center",
    gap: "0.3rem",
  },
  star: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  insightPanel: {
    borderTop: "1px solid #334155",
    marginTop: "1rem",
    paddingTop: "1rem",
  },
  insightText: {
    color: "#cbd5e1",
    fontSize: "0.85rem",
    lineHeight: 1.4,
    margin: "0.35rem 0",
  },
  select: {
    padding: "0.5rem",
    borderRadius: 6,
    border: "1px solid #334155",
    background: "#16213e",
    color: "#eee",
    fontSize: "0.9rem",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "0.65rem",
    borderRadius: 6,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#eee",
    fontSize: "0.95rem",
    marginBottom: "0.75rem",
    boxSizing: "border-box" as const,
  },
  footer: {
    textAlign: "center",
    padding: "2rem 1rem",
    color: "#475569",
    fontSize: "0.8rem",
  },
};
