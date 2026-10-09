import { useCallback, useEffect, useMemo, useState } from "react";
import ResultsPage from "./ResultsPage.jsx";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";
import {
  BookOpen,
  Clock3,
  FileUp,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  CircleHelp,
  ArrowLeft,
  ArrowRight,
  Flag,
  Timer,
  FileText,
  Sparkles,
  Search,
  Globe,
  ShieldCheck,
  Save
} from "lucide-react";
import api from "./api.js";

function ErrorText({ children }) {
  return children ? <div className="notice error">{children}</div> : null;
}

function Loading() {
  return <div className="loading">Loading your workspace…</div>;
}

function Protected({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");

  useEffect(() => {
    const token = localStorage.getItem("exam_token");

    if (!token) {
      setChecking(false);
      return;
    }

    api.get("/auth/me")
      .then(response => {
        setUser(response.data.user);
      })
      .catch(() => {
        localStorage.removeItem("exam_token");
        setUser(null);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  const logout = () => {
    localStorage.removeItem("exam_token");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const login = data => {
    localStorage.setItem("exam_token", data.token);
    setUser(data.user);
    navigate("/", { replace: true });
  };

  if (checking) {
    return <Loading />;
  }

  return (
    <div className="app-shell">
      {user && !isAdminPath && (
        <header className="topbar">
          <Link className="brand" to="/">
            <span className="brand-icon">
              <BookOpen size={21} />
            </span>
            <span>PrepSpace</span>
          </Link>

          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/library">Public library</Link>
            <Link to="/upload">Create test</Link>
            <Link to="/results">My Results</Link>
          </nav>

          <div className="user-menu">
            <span className="avatar">
              {user.name?.slice(0, 1).toUpperCase()}
            </span>
            <span className="user-name">{user.name}</span>
            <button
              className="icon-button"
              title="Log out"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
      )}

      <main
        className={
          user && !isAdminPath
            ? "main-content"
            : "auth-main"
        }
      >
        {toast && (
          <div className="toast">
            {toast}
            <button onClick={() => setToast("")}>×</button>
          </div>
        )}

        <Routes>
          <Route
            path="/login"
            element={
              user
                ? <Navigate to="/" replace />
                : <AuthPage mode="login" onAuth={login} />
            }
          />

          <Route
            path="/register"
            element={
              user
                ? <Navigate to="/" replace />
                : <AuthPage mode="register" onAuth={login} />
            }
          />

          <Route
            path="/"
            element={
              <Protected user={user}>
                <Dashboard />
              </Protected>
            }
          />

          <Route
            path="/upload"
            element={
              <Protected user={user}>
                <UploadPage
                  onCreated={() => {
                    setToast("Your test is ready.");
                    navigate("/");
                  }}
                />
              </Protected>
            }
          />

          <Route
            path="/library"
            element={
              <Protected user={user}>
                <PublicLibraryPage />
              </Protected>
            }
          />

          <Route
            path="/results"
            element={
              <Protected user={user}>
                <ResultsPage />
              </Protected>
            }
          />

          {/* Admin access remains independent of normal user login. */}
          <Route
            path="/admin"
            element={<AdminAccessPage />}
          />

          <Route
            path="/exam/:id"
            element={
              <Protected user={user}>
                <ExamPage />
              </Protected>
            }
          />

          <Route
            path="/attempt/:id"
            element={
              <Protected user={user}>
                <AttemptPage />
              </Protected>
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to={user ? "/" : "/login"}
                replace
              />
            }
          />
        </Routes>
      </main>

      {user && !isAdminPath && (
        <footer className="footer">
          Made for focused practice <span>•</span>{" "}
          Share useful papers with the PrepSpace community
        </footer>
      )}
    </div>
  );
}

function AdminAccessPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      setChecking(false);
      return;
    }

    api.get("/admin-auth/me")
      .then(() => {
        setAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  const submit = async event => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { data } = await api.post(
        "/admin-auth/login",
        { password }
      );

      localStorage.setItem("admin_token", data.token);
      setPassword("");
      setAuthenticated(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not verify admin password."
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
    setPassword("");
    setError("");
  };

  if (checking) {
    return <Loading />;
  }

  if (authenticated) {
    return <AdminPage onLogout={logout} />;
  }

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="brand light">
          <span className="brand-icon">
            <ShieldCheck size={21} />
          </span>
          <span>PrepSpace Admin</span>
        </div>

        <div className="auth-story-copy">
          <span className="eyebrow light-eyebrow">
            RESTRICTED AREA
          </span>
          <h1>Administrator access</h1>
          <p>
            Manage published papers and verify answer keys
            for the PrepSpace community.
          </p>
        </div>

        <div className="story-bottom">
          Authorized administrators only.
        </div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">SECURE SIGN IN</span>
          <h2>Admin dashboard</h2>
          <p className="muted">
            Enter the administrator password to continue.
          </p>

          <ErrorText>{error}</ErrorText>

          <label>
            Admin password
            <input
              autoFocus
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter admin password"
            />
          </label>

          <button
            className="primary full"
            disabled={busy}
          >
            {busy ? "Verifying…" : "Open admin dashboard"}
            <ArrowRight size={17} />
          </button>

          <p className="auth-switch">
            <Link to="/login">Return to user login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function AuthPage({ mode, onAuth }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  const submit = async e => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { data } = await api.post(
        `/auth/${register ? "register" : "login"}`,
        form
      );
      onAuth(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not connect to the server. Check that the backend is running."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="brand light">
          <span className="brand-icon">
            <BookOpen size={21} />
          </span>
          <span>PrepSpace</span>
        </div>

        <div className="auth-story-copy">
          <span className="eyebrow light-eyebrow">
            YOUR PERSONAL EXAM STUDIO
          </span>
          <h1>Turn every paper into a chance to improve.</h1>
          <p>
            Practice at your own pace, simulate exam conditions,
            and understand your progress after every attempt.
          </p>
          <div className="story-points">
            <span><CheckCircle2 size={17} /> Timed practice sessions</span>
            <span><CheckCircle2 size={17} /> Results and answer review</span>
            <span><CheckCircle2 size={17} /> Your papers, your workspace</span>
          </div>
        </div>

        <div className="story-bottom">
          Learn consistently. Improve confidently.
        </div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">
            {register ? "GET STARTED" : "WELCOME BACK"}
          </span>
          <h2>
            {register ? "Create your account" : "Sign in to PrepSpace"}
          </h2>
          <p className="muted">
            {register
              ? "Your next practice session starts here."
              : "Pick up where your preparation left off."}
          </p>

          <ErrorText>{error}</ErrorText>

          {register && (
            <label>
              Full name
              <input
                required
                minLength="2"
                value={form.name}
                onChange={e =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={e =>
                setForm({ ...form, email: e.target.value })
              }
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              minLength="8"
              type="password"
              value={form.password}
              onChange={e =>
                setForm({ ...form, password: e.target.value })
              }
              placeholder="At least 8 characters"
            />
          </label>

          <button className="primary full" disabled={busy}>
            {busy
              ? "Please wait…"
              : register
                ? "Create account"
                : "Sign in"}
            <ArrowRight size={17} />
          </button>

          <p className="auth-switch">
            {register
              ? "Already have an account?"
              : "New to PrepSpace?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function Dashboard() {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [e, a] = await Promise.all([
        api.get("/exams"),
        api.get("/attempts/history/list")
      ]);
      setExams(e.data.exams);
      setAttempts(a.data.attempts);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not load your dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitted = attempts.filter(a => a.status === "submitted");
  const avg = submitted.length
    ? Math.round(
        submitted.reduce(
          (sum, a) => sum + (a.result?.percentage || 0),
          0
        ) / submitted.length
      )
    : 0;

  const remove = async id => {
    if (!confirm("Delete this test? In-progress attempts may also be removed.")) {
      return;
    }

    try {
      await api.delete(`/exams/${id}`);
      refresh();
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not delete test."
      );
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Ready to make progress?</h1>
          <p className="muted">
            Create a test from a question paper, then practice under timed conditions.
          </p>
        </div>
        <Link to="/upload" className="primary link-button">
          <Plus size={18} /> Create a test
        </Link>
      </section>

      <ErrorText>{error}</ErrorText>

      <section className="stats-grid">
        <Stat
          icon={<FileText />}
          label="My tests"
          value={exams.length}
          caption="Papers ready to practice"
        />
        <Stat
          icon={<CheckCircle2 />}
          label="Completed attempts"
          value={submitted.length}
          caption="Tests submitted"
        />
        <Stat
          icon={<Sparkles />}
          label="Average score"
          value={`${avg}%`}
          caption="Across graded attempts"
        />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Your tests</h2>
            <p className="muted">Upload a paper or continue practicing.</p>
          </div>
          <Link to="/upload" className="text-link">+ New test</Link>
        </div>

        {exams.length ? (
          <div className="exam-grid">
            {exams.map(exam => (
              <article className="exam-card" key={exam.id}>
                <div className="card-icon">
                  <BookOpen size={21} />
                </div>
                <div className="exam-card-top">
                  <span className="pill">
                    {exam.questionCount} questions
                  </span>
                  <span className={`pill ${exam.isPublic ? "good" : "neutral"}`}>
                    {exam.isPublic ? "Public" : "Private"}
                  </span>
                  <button
                    className="icon-button danger-icon"
                    onClick={() => remove(exam.id)}
                    title="Delete test"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <h3>{exam.title}</h3>

                {(exam.subject || exam.year) && (
                  <div className="library-meta">
                    {exam.subject && <span>{exam.subject}</span>}
                    {exam.year && <span>{exam.year}</span>}
                  </div>
                )}

                <div className="card-meta">
                  <span><Clock3 size={15} /> {exam.durationMinutes} min</span>
                  <span><CheckCircle2 size={15} /> {exam.attemptCount} attempts</span>
                </div>

                <Link to={`/exam/${exam.id}`} className="secondary-button">
                  Open test <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><FileUp size={26} /></div>
            <h3>Your first practice test starts here</h3>
            <p>
              Upload a question paper PDF. We'll extract what we can,
              then you can correct and save the questions.
            </p>
            <Link to="/upload" className="primary link-button">
              <Plus size={17} /> Create your first test
            </Link>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Recent attempts</h2>
            <p className="muted">Your latest exam sessions.</p>
          </div>
          <Link to="/results" className="text-link">View all results</Link>
        </div>

        {attempts.length ? (
          <div className="history-list">
            {attempts.slice(0, 6).map(a => (
              <div className="history-row" key={a.id}>
                <div className="history-icon">
                  <BookOpen size={18} />
                </div>
                <div className="history-info">
                  <strong>{a.examTitle}</strong>
                  <span>{new Date(a.startedAt).toLocaleString()}</span>
                </div>
                <div className="history-score">
                  {a.status === "submitted"
                    ? `${a.result?.percentage ?? 0}%`
                    : <span className="pill neutral">In progress</span>}
                </div>
                <Link to={`/attempt/${a.id}`} className="text-link">
                  {a.status === "submitted" ? "View result" : "Continue"}{" "}
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted empty-note">
            Your completed and in-progress sessions will appear here.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, caption }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-caption">{caption}</div>
    </div>
  );
}

function PublicLibraryPage() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [query, setQuery] = useState({
    search: "",
    subject: "",
    year: ""
  });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (query.search) params.search = query.search;
      if (query.subject) params.subject = query.subject;
      if (query.year) params.year = query.year;

      const { data } = await api.get("/exams/public", { params });
      setExams(data.exams || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Could not load the public library."
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const searchSubmit = e => {
    e.preventDefault();
    setQuery({
      search: search.trim(),
      subject: subject.trim(),
      year: year.trim()
    });
  };

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">COMMUNITY PRACTICE</span>
          <h1>Public exam library</h1>
          <p className="muted">
            Discover papers shared by other students and practice under timed conditions.
          </p>
        </div>
        <Link to="/upload" className="primary link-button">
          <Plus size={17} /> Share a paper
        </Link>
      </section>

      <form className="library-search panel" onSubmit={searchSubmit}>
        <label>
          Search papers
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Exam name or keyword"
          />
        </label>
        <label>
          Subject
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Mathematics"
          />
        </label>
        <label>
          Year
          <input
            type="number"
            min="1900"
            max="2200"
            value={year}
            onChange={e => setYear(e.target.value)}
            placeholder="2025"
          />
        </label>
        <button className="primary">
          <Search size={16} /> Search
        </button>
      </form>

      <ErrorText>{error}</ErrorText>

      {loading ? (
        <Loading />
      ) : exams.length ? (
        <div className="exam-grid">
          {exams.map(exam => (
            <article className="exam-card" key={exam.id}>
              <div className="card-icon"><Globe size={21} /></div>
              <div className="exam-card-top">
                <span className="pill">{exam.questionCount} questions</span>
                <span className={`pill ${exam.hasAnswerKey ? "good" : "neutral"}`}>
                  {exam.hasAnswerKey ? "Answer key available" : "Key pending"}
                </span>
              </div>

              <h3>{exam.title}</h3>

              <div className="library-meta">
                {exam.subject && <span>{exam.subject}</span>}
                {exam.year && <span>{exam.year}</span>}
              </div>

              {exam.description && (
                <p className="library-description">{exam.description}</p>
              )}

              <div className="card-meta">
                <span><Clock3 size={15} /> {exam.durationMinutes} min</span>
                <span><CheckCircle2 size={15} /> {exam.attemptCount} attempts</span>
              </div>

              <Link to={`/exam/${exam.id}`} className="secondary-button">
                View paper <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><BookOpen size={26} /></div>
          <h3>No published papers found</h3>
          <p>
            Try another search, or be the first to share a practice paper with the community.
          </p>
          <Link to="/upload" className="primary link-button">
            <Plus size={17} /> Share a paper
          </Link>
        </div>
      )}
    </div>
  );
}

function AdminPage({ onLogout }) {
  const [exams, setExams] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExam, setLoadingExam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/exams");
      setExams(data.exams || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
        "Could not load papers for admin review."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const openExam = async id => {
    setSelectedId(id);
    setLoadingExam(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.get(`/admin/exams/${id}`);
      setExam(data.exam);
      setQuestions(
        data.exam.questions.map(q => ({
          ...q,
          correctIndex: q.correctIndex ?? ""
        }))
      );
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not open this paper."
      );
      setExam(null);
      setQuestions([]);
    } finally {
      setLoadingExam(false);
    }
  };

  const updateQuestion = (id, patch) => {
    setQuestions(old =>
      old.map(q => q.id === id ? { ...q, ...patch } : q)
    );
  };

  const saveKey = async e => {
    e.preventDefault();
    if (!exam) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const answers = questions.map(q => ({
        questionId: q.id,
        correctIndex: q.correctIndex === "" ? null : Number(q.correctIndex),
        explanation: q.explanation || ""
      }));

      const { data } = await api.put(
        `/admin/exams/${exam.id}/answer-key`,
        { answers }
      );

      setNotice(data.message || "Answer key saved.");
      await loadExams();
      await openExam(exam.id);
    } catch (e2) {
      setError(
        e2.response?.data?.message || "Could not save the answer key."
      );
    } finally {
      setSaving(false);
    }
  };

  const missing = exams.reduce(
    (sum, item) => sum + item.missingCount,
    0
  );

  if (loading && !exams.length) return <Loading />;

  return (
    <div className="page-stack admin-page">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Answer-key management</h1>
          <p className="muted">
            Review published papers and add or correct answer keys for the community.
          </p>
        </div>

        <div className="admin-summary">
          <strong>{exams.length}</strong>
          <span>Published papers</span>

          <strong>{missing}</strong>
          <span>Questions without keys</span>

          <button
            type="button"
            className="secondary-button"
            onClick={onLogout}
          >
            Admin logout <LogOut size={16} />
          </button>
        </div>
      </section>

      <ErrorText>{error}</ErrorText>
      {notice && <div className="notice success">{notice}</div>}

      <div className="admin-layout">
        <section className="panel admin-paper-list">
          <div className="section-heading">
            <div>
              <h2>Published papers</h2>
              <p className="muted">
                Papers with missing answers are prioritized.
              </p>
            </div>
            <button
              className="icon-button"
              onClick={loadExams}
              title="Refresh list"
            >
              ↻
            </button>
          </div>

          {exams.length ? (
            exams.map(item => (
              <button
                type="button"
                key={item.id}
                className={`admin-paper-item ${selectedId === item.id ? "selected" : ""}`}
                onClick={() => openExam(item.id)}
              >
                <span className="admin-paper-title">{item.title}</span>
                <span className="admin-paper-meta">
                  {item.subject || "No subject"}
                  {item.year ? ` · ${item.year}` : ""}
                </span>
                <span className={`pill ${item.missingCount === 0 ? "good" : "neutral"}`}>
                  {item.missingCount === 0
                    ? (item.answerKeyStatus === "admin-verified" ? "Verified" : "All keys set")
                    : `${item.missingCount} key(s) missing`}
                </span>
              </button>
            ))
          ) : (
            <p className="muted empty-note">No published papers yet.</p>
          )}
        </section>

        <section className="panel admin-key-editor">
          {!selectedId ? (
            <div className="admin-empty">
              <ShieldCheck size={30} />
              <h2>Select a paper</h2>
              <p className="muted">
                Choose a published paper on the left to review its questions and answer key.
              </p>
            </div>
          ) : loadingExam ? (
            <Loading />
          ) : exam ? (
            <form onSubmit={saveKey}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">ANSWER KEY</span>
                  <h2>{exam.title}</h2>
                  <p className="muted">
                    {exam.subject || "General"}
                    {exam.year ? ` · ${exam.year}` : ""}
                    {" · "}{questions.length} questions
                  </p>
                </div>
                <span className={`pill ${exam.missingCount === 0 ? "good" : "neutral"}`}>
                  {questions.filter(q => q.correctIndex !== "").length}/{questions.length} keyed
                </span>
              </div>

              <p className="muted small">
                Select the correct option for each question. Explanations are optional.
                Saving all answers marks the key as admin-verified.
              </p>

              <div className="admin-question-list">
                {questions.map((q, index) => (
                  <article className="admin-question" key={q.id}>
                    <div className="admin-question-title">
                      <span className="question-number">Q{index + 1}</span>
                      <strong>{q.text}</strong>
                    </div>

                    <label>
                      Correct answer
                      <select
                        value={q.correctIndex}
                        onChange={e =>
                          updateQuestion(q.id, { correctIndex: e.target.value })
                        }
                      >
                        <option value="">No answer key</option>
                        {q.options.map((option, oi) => (
                          <option key={oi} value={oi}>
                            {String.fromCharCode(65 + oi)}. {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Explanation (optional)
                      <textarea
                        rows="2"
                        value={q.explanation || ""}
                        onChange={e =>
                          updateQuestion(q.id, { explanation: e.target.value })
                        }
                        placeholder="Explain why this option is correct"
                      />
                    </label>
                  </article>
                ))}
              </div>

              <button className="primary full" disabled={saving}>
                <Save size={17} />
                {saving ? "Saving answer key…" : "Save and verify answer key"}
              </button>
            </form>
          ) : (
            <p className="muted">Could not load the selected paper.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/*
 * Normalize common answer-key response formats.
 * Supports answers such as ["B", "A", "D"] and
 * [{ questionNumber: 1, answer: "B" }, ...].
 */
function normalizeAnswerKey(data) {
  const raw =
    data?.answers ??
    data?.answerKey ??
    data?.correctAnswers ??
    data?.results;

  const entries = [];

  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      if (typeof item === "string" || typeof item === "number") {
        entries.push([index, item]);
        return;
      }

      if (!item || typeof item !== "object") return;

      const questionNumber = Number(
        item.questionNumber ??
        item.question ??
        item.number ??
        item.q ??
        index + 1
      );

      const answer = item.correctIndex !== undefined
        ? { index: Number(item.correctIndex) }
        : (
            item.correctAnswer ??
            item.answer ??
            item.option ??
            item.correctOption ??
            item.value
          );

      if (
        Number.isFinite(questionNumber) &&
        answer !== undefined &&
        answer !== null &&
        answer !== ""
      ) {
        entries.push([questionNumber - 1, answer]);
      }
    });
  } else if (raw && typeof raw === "object") {
    Object.entries(raw).forEach(([question, answer]) => {
      const questionNumber = Number(
        String(question).replace(/[^0-9]/g, "")
      );

      if (Number.isFinite(questionNumber) && questionNumber > 0) {
        entries.push([questionNumber - 1, answer]);
      }
    });
  }

  const normalized = {};

  entries.forEach(([questionIndex, answer]) => {
    if (!Number.isInteger(questionIndex) || questionIndex < 0) return;

    if (
      answer &&
      typeof answer === "object" &&
      Number.isInteger(answer.index)
    ) {
      normalized[questionIndex] = answer.index;
      return;
    }

    const value = String(answer)
      .trim()
      .toUpperCase()
      .replace(/^[\s([.]+|[\s).,]+$/g, "");

    const letter = value.match(/^([A-F])$/);

    if (letter) {
      normalized[questionIndex] = letter[1].charCodeAt(0) - 65;
      return;
    }

    const numeric = value.match(/^(?:OPTION\s*)?([1-6])$/);

    if (numeric) {
      normalized[questionIndex] = Number(numeric[1]) - 1;
    }
  });

  return normalized;
}

function UploadPage({ onCreated }) {
  const [file, setFile] = useState(null);
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [questions, setQuestions] = useState([]);
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [marks, setMarks] = useState(1);
  const [negative, setNegative] = useState(0);
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stage, setStage] = useState("upload");

  const parse = async e => {
    e.preventDefault();

    if (!file) {
      setError("Choose a question paper PDF first.");
      return;
    }

    if (!answerKeyFile) {
      setError("Uploading the answer-key PDF is mandatory.");
      return;
    }

    setError("");
    setNotice("");
    setBusy(true);

    try {
      const paperBody = new FormData();
      paperBody.append("paper", file);

      const answerBody = new FormData();
      answerBody.append("answerKey", answerKeyFile);

      const [paperResponse, keyResponse] = await Promise.all([
        api.post(
          "/papers/parse",
          paperBody,
          { headers: { "Content-Type": "multipart/form-data" } }
        ),
        api.post(
          "/papers/parse-answer-key",
          answerBody,
          { headers: { "Content-Type": "multipart/form-data" } }
        )
      ]);

      const extractedQuestions = paperResponse.data.questions || [];
      const parsedAnswers = normalizeAnswerKey(keyResponse.data);

      const mergedQuestions = extractedQuestions.map((question, index) => ({
        ...question,
        correctIndex:
          Number.isInteger(parsedAnswers[index]) &&
          parsedAnswers[index] >= 0 &&
          parsedAnswers[index] < (question.options || []).length
            ? parsedAnswers[index]
            : (question.correctIndex ?? null)
      }));

      setRawText(paperResponse.data.extractedText || "");
      setAnswerKeyText(
        keyResponse.data.extractedText ||
        keyResponse.data.rawText ||
        ""
      );
      setQuestions(mergedQuestions);

      if (!title) {
        setTitle(
          file.name
            .replace(/\.pdf$/i, "")
            .replace(/[_-]+/g, " ")
        );
      }

      const keyedCount = mergedQuestions.filter(
        q => q.correctIndex !== null && q.correctIndex !== undefined
      ).length;

      setNotice(
        mergedQuestions.length
          ? `Detected ${mergedQuestions.length} possible MCQs and matched ${keyedCount} answer(s) from the answer-key PDF. Review every question and correct answer before saving.`
          : "Text was extracted from the PDFs, but no MCQs were detected confidently. You can add questions manually and set the answer key for each one."
      );

      setStage("edit");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not parse both PDFs. Use text-based PDFs and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const updateQ = (index, patch) => {
    setQuestions(old =>
      old.map((q, i) => i === index ? { ...q, ...patch } : q)
    );
  };

  const addQ = () => {
    setQuestions(old => [
      ...old,
      {
        text: "",
        options: ["", "", "", ""],
        correctIndex: null,
        explanation: ""
      }
    ]);
  };

  const deleteQ = index => {
    setQuestions(old => old.filter((_, i) => i !== index));
  };

  const updateOption = (qi, oi, value) => {
    setQuestions(old =>
      old.map((q, i) =>
        i === qi
          ? {
              ...q,
              options: q.options.map((o, j) => j === oi ? value : o)
            }
          : q
      )
    );
  };

  const addOption = qi => {
    setQuestions(old =>
      old.map((q, i) =>
        i === qi
          ? { ...q, options: [...q.options, ""] }
          : q
      )
    );
  };

  const removeOption = (qi, oi) => {
    setQuestions(old =>
      old.map((q, i) =>
        i === qi
          ? {
              ...q,
              options: q.options.filter((_, j) => j !== oi),
              correctIndex:
                q.correctIndex === oi
                  ? null
                  : q.correctIndex > oi
                    ? q.correctIndex - 1
                    : q.correctIndex
            }
          : q
      )
    );
  };

  const save = async () => {
    setError("");

    if (!answerKeyFile) {
      setError("An answer-key PDF is required before a test can be saved.");
      setStage("upload");
      return;
    }

    if (!title.trim()) {
      setError("Enter a test title.");
      return;
    }

    if (!questions.length) {
      setError("Add at least one question.");
      return;
    }

    const invalidQuestion = questions.findIndex(q =>
      !q.text?.trim() ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.some(option => !String(option).trim()) ||
      q.correctIndex === null ||
      q.correctIndex === undefined ||
      q.correctIndex === "" ||
      !Number.isInteger(Number(q.correctIndex)) ||
      Number(q.correctIndex) < 0 ||
      Number(q.correctIndex) >= q.options.length
    );

    if (invalidQuestion !== -1) {
      setError(
        `Question ${invalidQuestion + 1} needs question text, at least two filled options, and a correct answer selected.`
      );
      return;
    }

    setSaving(true);

    try {
      const { data } = await api.post("/exams", {
        title: title.trim(),
        subject,
        year: year ? Number(year) : null,
        description,
        isPublic,
        durationMinutes: Number(duration),
        marksPerQuestion: Number(marks),
        negativeMarks: Number(negative),
        answerKeyFileName: answerKeyFile.name,
        questions: questions.map(q => ({
          ...q,
          correctIndex: Number(q.correctIndex)
        }))
      });

      onCreated(data.exam);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not save test. Check all questions and options."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack narrow-page">
      <div className="page-title-row">
        <div>
          <Link to="/" className="back-link">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1>Create a practice test</h1>
          <p className="muted">
            Upload a paper and its answer key, review the extracted MCQs,
            and set your exam conditions.
          </p>
        </div>
      </div>

      <div className="stepper">
        <div className={stage === "upload" ? "step active" : "step done"}>
          <span>1</span> Upload PDFs
        </div>
        <div className="step-line" />
        <div className={stage === "edit" ? "step active" : "step"}>
          <span>2</span> Review questions
        </div>
        <div className="step-line" />
        <div className="step">
          <span>3</span> Save test
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      {stage === "upload" ? (
        <form className="panel upload-panel" onSubmit={parse}>
          <div className="panel-heading">
            <div className="panel-icon">
              <FileUp size={21} />
            </div>
            <div>
              <h2>Upload your question paper</h2>
              <p className="muted">
                Question paper and answer-key PDFs are both required.
                Maximum 12 MB each.
              </p>
            </div>
          </div>

          <label className="dropzone">
            <input
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <span className="drop-icon"><FileUp size={26} /></span>
            <strong>
              {file ? file.name : "Choose the question paper PDF"}
            </strong>
            <span className="muted">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected`
                : "Click here to browse your files"}
            </span>
            <span className="file-hint">
              The PDF is processed for extraction and is not permanently stored by this MVP.
            </span>
          </label>

          <div className="panel-heading answer-key-upload-heading">
            <div className="panel-icon">
              <CheckCircle2 size={21} />
            </div>
            <div>
              <h2>
                Upload the answer key <span className="required-mark">*</span>
              </h2>
              <p className="muted">
                Mandatory. We'll try to match answers automatically,
                and you can correct them before saving.
              </p>
            </div>
          </div>

          <label className="dropzone answer-key-dropzone">
            <input
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={e =>
                setAnswerKeyFile(e.target.files?.[0] || null)
              }
            />
            <span className="drop-icon"><FileText size={26} /></span>
            <strong>
              {answerKeyFile
                ? answerKeyFile.name
                : "Choose the answer-key PDF"}
            </strong>
            <span className="muted">
              {answerKeyFile
                ? `${(answerKeyFile.size / 1024 / 1024).toFixed(2)} MB selected`
                : "An answer-key PDF is required to continue"}
            </span>
          </label>

          <div className="info-box">
            <CircleHelp size={18} />
            <p>
              <strong>Best results:</strong> use text-based PDFs with
              numbered questions and options labelled A), B), C), D).
              Scanned PDFs need OCR, which is not enabled yet. Always
              review the extracted answers because automatic matching
              may not be perfect.
            </p>
          </div>

          <button
            className="primary full"
            disabled={!file || !answerKeyFile || busy}
          >
            {busy
              ? "Extracting both PDFs…"
              : "Extract questions and answer key"}
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            className="secondary-button full"
            onClick={() => {
              setTitle("My practice test");
              setQuestions([
                {
                  text: "",
                  options: ["", "", "", ""],
                  correctIndex: null,
                  explanation: ""
                }
              ]);
              setStage("edit");
            }}
          >
            Or create questions manually (answer-key PDF still required)
          </button>
        </form>
      ) : (
        <>
          {notice && (
            <div className="notice success">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}

          {rawText && (
            <details className="panel raw-panel">
              <summary>View extracted question-paper text</summary>
              <pre>{rawText}</pre>
            </details>
          )}

          {answerKeyText && (
            <details className="panel raw-panel">
              <summary>View extracted answer-key text</summary>
              <pre>{answerKeyText}</pre>
            </details>
          )}

          <div className="panel settings-panel">
            <div className="panel-heading">
              <div className="panel-icon">
                <Timer size={21} />
              </div>
              <div>
                <h2>Test settings</h2>
                <p className="muted">
                  You can change these before each attempt.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Exam name / test title
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength="150"
                  placeholder="e.g. GATE CSE 2025"
                  required
                />
              </label>

              <label>
                Subject (optional)
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength="100"
                  placeholder="e.g. Computer Science"
                />
              </label>

              <label>
                Exam year (optional)
                <input
                  type="number"
                  min="1900"
                  max="2200"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  placeholder="e.g. 2025"
                />
              </label>

              <label>
                Duration
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                >
                  {[15, 30, 45, 60, 90, 120, 180, 240, 300, 360].map(n => (
                    <option key={n} value={n}>
                      {n < 60
                        ? `${n} minutes`
                        : `${n / 60} hour${n === 60 ? "" : "s"}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Marks per correct answer
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.25"
                  value={marks}
                  onChange={e => setMarks(e.target.value)}
                />
              </label>

              <label>
                Negative marks per wrong answer
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.25"
                  value={negative}
                  onChange={e => setNegative(e.target.value)}
                />
              </label>
            </div>

            <label className="description-field">
              Description (optional)
              <textarea
                rows="2"
                maxLength="1000"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add details to help other students find this paper."
              />
            </label>

            <label className="publish-toggle">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
              />
              <span>
                <strong>Publish to the public library</strong>
                <small>
                  Other signed-in PrepSpace users can attempt this paper.
                  Answer keys stay hidden until they submit.
                </small>
              </span>
            </label>
          </div>

          <div className="editor-heading">
            <div>
              <h2>Review questions</h2>
              <p className="muted">
                Correct answers matched from {answerKeyFile?.name || "the answer-key PDF"}
                {" "}are preselected where detected. Review every answer;
                all questions must have a correct answer before saving.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={addQ}
            >
              <Plus size={16} /> Add question
            </button>
          </div>

          {questions.map((q, qi) => (
            <article className="panel question-editor" key={qi}>
              <div className="question-editor-head">
                <span className="question-number">Q{qi + 1}</span>
                <span className="muted small">
                  {q.options.length} options
                </span>
                <button
                  type="button"
                  className="icon-button danger-icon"
                  onClick={() => deleteQ(qi)}
                  title="Remove question"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <label>
                Question text
                <textarea
                  rows="2"
                  value={q.text}
                  onChange={e => updateQ(qi, { text: e.target.value })}
                  placeholder="Enter the question…"
                />
              </label>

              <div className="option-editor-list">
                {q.options.map((opt, oi) => (
                  <div className="option-editor" key={oi}>
                    <button
                      type="button"
                      className={`answer-key ${q.correctIndex === oi ? "selected" : ""}`}
                      onClick={() =>
                        updateQ(qi, {
                          correctIndex: q.correctIndex === oi ? null : oi
                        })
                      }
                      title="Mark as correct answer"
                    >
                      {String.fromCharCode(65 + oi)}
                    </button>

                    <input
                      value={opt}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    />

                    {q.options.length > 2 && (
                      <button
                        type="button"
                        className="mini-delete"
                        onClick={() => removeOption(qi, oi)}
                        title="Remove option"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {q.options.length < 6 && (
                <button
                  type="button"
                  className="text-link add-option"
                  onClick={() => addOption(qi)}
                >
                  <Plus size={14} /> Add option
                </button>
              )}

              <label className="explanation-label">
                Explanation (optional)
                <textarea
                  rows="2"
                  value={q.explanation || ""}
                  onChange={e =>
                    updateQ(qi, { explanation: e.target.value })
                  }
                  placeholder="Why is this the correct answer?"
                />
              </label>

              <div className="answer-key-hint">
                <CircleHelp size={14} />
                Click a letter to set the correct answer.{" "}
                {q.correctIndex === null || q.correctIndex === undefined
                  ? "No answer key set."
                  : "Correct answer: " + String.fromCharCode(65 + q.correctIndex)}
              </div>
            </article>
          ))}

          {!questions.length && (
            <div className="empty-state">
              <p>No questions yet. Add one manually.</p>
              <button type="button" className="primary" onClick={addQ}>
                <Plus size={16} /> Add question
              </button>
            </div>
          )}

          <div className="save-bar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStage("upload")}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              className="primary"
              disabled={saving || !title.trim() || questions.length === 0}
              onClick={save}
            >
              {saving ? "Saving test…" : "Save test"}
              <CheckCircle2 size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/exams/${id}`)
      .then(r => setExam(r.data.exam))
      .catch(e => setError(
        e.response?.data?.message || "Could not load test."
      ));
  }, [id]);

  const start = async () => {
    setBusy(true);
    setError("");

    try {
      const { data } = await api.post(`/attempts/start/${id}`);
      navigate(`/attempt/${data.attempt.id}`);
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not start test."
      );
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="page-stack">
        <ErrorText>{error}</ErrorText>
        <Link to="/" className="text-link">Back to dashboard</Link>
      </div>
    );
  }

  if (!exam) return <Loading />;

  const graded = exam.questions.filter(
    q => q.hasAnswerKey === true ||
      (q.correctIndex !== null && q.correctIndex !== undefined)
  ).length;

  return (
    <div className="page-stack narrow-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <section className="panel exam-intro">
        <div className="large-book"><BookOpen size={28} /></div>
        <span className="eyebrow">PRACTICE TEST</span>
        <h1>{exam.title}</h1>
        <p className="muted">
          Take this test in a focused, timed session. Your answers are saved as you go.
        </p>

        <div className="exam-detail-grid">
          <div>
            <Clock3 />
            <strong>{exam.durationMinutes} min</strong>
            <span>Time limit</span>
          </div>
          <div>
            <CircleHelp />
            <strong>{exam.questions.length}</strong>
            <span>Questions</span>
          </div>
          <div>
            <CheckCircle2 />
            <strong>{graded}/{exam.questions.length}</strong>
            <span>Answer keys set</span>
          </div>
        </div>

        <div className="info-box">
          <CircleHelp size={18} />
          <p>
            {graded === exam.questions.length
              ? "All questions have answer keys. Your score will be calculated automatically."
              : `${exam.questions.length - graded} question(s) do not have a confirmed answer key. Those questions will be shown as ungraded and excluded from the maximum score.`}
          </p>
        </div>

        <button
          className="primary full"
          onClick={start}
          disabled={busy}
        >
          {busy ? "Starting…" : "Start test"}
          <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}

function AttemptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [marked, setMarked] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = useCallback(async () => {
    const { data: d } = await api.get(`/attempts/${id}`);
    setData(d);
    setAnswers(d.attempt.answers || {});

    if (d.attempt.status === "submitted") {
      setSubmitted(true);
      return;
    }

    setRemaining(
      Math.max(
        0,
        Math.floor(
          (new Date(d.attempt.deadlineAt).getTime() - Date.now()) / 1000
        )
      )
    );
  }, [id]);

  useEffect(() => {
    load().catch(e =>
      setError(e.response?.data?.message || "Could not load attempt.")
    );
  }, [load]);

  const submit = useCallback(async () => {
    if (submitted) return;

    setSaving(true);
    setError("");

    try {
      await api.put(`/attempts/${id}/answers`, { answers }).catch(e => {
        if (e.response?.status !== 409) throw e;
      });

      await api.post(`/attempts/${id}/submit`);
      setSubmitted(true);

      const full = await api.get(`/attempts/${id}`);
      setData(full.data);
      setAnswers(full.data.attempt.answers || answers);
    } catch (e) {
      setError(
        e.response?.data?.message || "Submission failed. Please try again."
      );
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  }, [id, answers, submitted]);

  useEffect(() => {
    if (!data || submitted || data.attempt.status === "submitted") return;

    const tick = () => {
      const seconds = Math.max(
        0,
        Math.floor(
          (new Date(data.attempt.deadlineAt).getTime() - Date.now()) / 1000
        )
      );

      setRemaining(seconds);

      if (seconds <= 0) submit();
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data, submitted, submit]);

  const saveAnswers = async nextAnswers => {
    setAnswers(nextAnswers);
    setSaving(true);

    try {
      await api.put(`/attempts/${id}/answers`, { answers: nextAnswers });
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not save answer."
      );
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) {
    return (
      <div className="page-stack">
        <ErrorText>{error}</ErrorText>
        <Link to="/" className="text-link">Dashboard</Link>
      </div>
    );
  }

  if (!data) return <Loading />;

  if (submitted || data.attempt.status === "submitted") {
    return <ResultView data={data} answers={answers} />;
  }

  const questions = data.exam.questions;
  const q = questions[current];
  const answered = Object.keys(answers).length;

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const selectOption = value => saveAnswers({ ...answers, [q.id]: value });

  const clearAnswer = () => {
    const next = { ...answers };
    delete next[q.id];
    saveAnswers(next);
  };

  const submitClick = () => setShowConfirm(true);

  return (
    <div className="test-shell">
      <header className="test-topbar">
        <Link to="/" className="brand">
          <span className="brand-icon"><BookOpen size={20} /></span>
          <span>PrepSpace</span>
        </Link>

        <div className="test-top-title">
          <strong>{data.exam.title}</strong>
          <span>{questions.length} questions</span>
        </div>

        <div className={`timer-box ${remaining < 300 ? "timer-warning" : ""}`}>
          <Clock3 size={18} />
          <div>
            <strong>{formatTime(remaining)}</strong>
            <span>Time left</span>
          </div>
        </div>
      </header>

      <div className="test-body">
        <section className="test-question-panel">
          <div className="test-progress-row">
            <span>Question {current + 1} of {questions.length}</span>
            <span>{answered}/{questions.length} answered</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="question-content">
            <div className="question-title-row">
              <span className="question-number large-q">Q{current + 1}</span>
              <button
                className={`review-button ${marked.includes(q.id) ? "is-marked" : ""}`}
                onClick={() =>
                  setMarked(m =>
                    m.includes(q.id)
                      ? m.filter(x => x !== q.id)
                      : [...m, q.id]
                  )
                }
              >
                <Flag size={16} />
                {marked.includes(q.id) ? "Marked for review" : "Mark for review"}
              </button>
            </div>

            <h2>{q.text}</h2>

            <div className="answer-options">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`answer-option ${answers[q.id] === i ? "chosen" : ""}`}
                  onClick={() => selectOption(i)}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                  <span className="option-radio">
                    {answers[q.id] === i && <span />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="test-question-footer">
            <button
              className="secondary-button"
              disabled={current === 0}
              onClick={() => setCurrent(c => c - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>

            <button
              className="clear-answer"
              onClick={clearAnswer}
              disabled={answers[q.id] === undefined}
            >
              Clear answer
            </button>

            {current < questions.length - 1 ? (
              <button
                className="primary"
                onClick={() => setCurrent(c => c + 1)}
              >
                Save & Next <ArrowRight size={16} />
              </button>
            ) : (
              <button className="primary" onClick={submitClick}>
                Submit test <CheckCircle2 size={16} />
              </button>
            )}
          </div>

          {error && <ErrorText>{error}</ErrorText>}
        </section>

        <aside className="question-sidebar">
          <div className="sidebar-heading">
            <h3>Question palette</h3>
            <span className="muted">{questions.length} total</span>
          </div>

          <div className="palette-legend">
            <span><i className="legend-dot answered-dot" /> Answered</span>
            <span><i className="legend-dot review-dot" /> Review</span>
            <span><i className="legend-dot" /> Not answered</span>
          </div>

          <div className="question-palette">
            {questions.map((item, i) => (
              <button
                key={item.id}
                className={`${i === current ? "active" : ""} ${answers[item.id] !== undefined ? "answered" : ""} ${marked.includes(item.id) ? "marked" : ""}`}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="sidebar-summary">
            <div><span>Answered</span><strong>{answered}</strong></div>
            <div><span>Unanswered</span><strong>{questions.length - answered}</strong></div>
            <div><span>For review</span><strong>{marked.length}</strong></div>
          </div>

          <button className="primary full" onClick={submitClick}>
            Submit test <ArrowRight size={16} />
          </button>

          <p className="autosave-note">
            {saving ? "Saving your answer…" : "Answers are saved to your account."}
          </p>
        </aside>
      </div>

      {showConfirm && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <div className="modal-icon"><CheckCircle2 size={24} /></div>
            <h2>Submit your test?</h2>
            <p>
              You have answered {answered} of {questions.length} questions.
              You cannot change your answers after submission.
            </p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setShowConfirm(false)}
              >
                Keep working
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => submit()}
              >
                {saving ? "Submitting…" : "Submit test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultView({ data, answers }) {
  const r = data.attempt.result || {};
  const qs = data.exam?.questions || [];
  const [showReview, setShowReview] = useState(true);
  const duration = Math.max(0, r.timeTakenSeconds || 0);
  const timeText = `${Math.floor(duration / 60)}m ${duration % 60}s`;

  return (
    <div className="page-stack narrow-page result-page">
      <div className="result-hero">
        <div className="result-check"><CheckCircle2 size={30} /></div>
        <span className="eyebrow light-eyebrow">TEST COMPLETED</span>
        <h1>{data.exam?.title || "Your result"}</h1>
        <p>Your attempt has been submitted. Here's how you did.</p>

        <div className="score-ring">
          <div>
            <strong>{r.percentage ?? 0}%</strong>
            <span>Score</span>
          </div>
        </div>

        <div className="score-summary">
          <div><strong>{r.score ?? 0}</strong><span>Marks earned</span></div>
          <div><strong>{r.maxScore ?? 0}</strong><span>Maximum marks</span></div>
          <div><strong>{timeText}</strong><span>Time taken</span></div>
        </div>
      </div>

      <div className="stats-grid result-stats">
        <Stat
          icon={<CheckCircle2 />}
          label="Correct"
          value={r.correct ?? 0}
          caption="Correct answers"
        />
        <Stat
          icon={<CircleHelp />}
          label="Incorrect"
          value={r.incorrect ?? 0}
          caption="Wrong answers"
        />
        <Stat
          icon={<Clock3 />}
          label="Unanswered"
          value={r.unanswered ?? 0}
          caption={`${r.ungraded ?? 0} ungraded question(s)`}
        />
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Answer review</h2>
            <p className="muted">Compare your choices with the answer key.</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => setShowReview(s => !s)}
          >
            {showReview ? "Hide review" : "Show review"}
          </button>
        </div>

        {showReview && (
          <div className="review-list">
            {qs.map((q, i) => {
              const selected = answers[q.id];
              const key = q.correctIndex;
              const graded = key !== null && key !== undefined;

              return (
                <article className="panel review-card" key={q.id}>
                  <div className="review-card-title">
                    <span className="question-number">Q{i + 1}</span>
                    <span className={`pill ${!graded ? "neutral" : selected === key ? "good" : "bad"}`}>
                      {!graded
                        ? "Ungraded"
                        : selected === key
                          ? "Correct"
                          : selected === undefined
                            ? "Unanswered"
                            : "Incorrect"}
                    </span>
                  </div>

                  <h3>{q.text}</h3>

                  <div className="review-options">
                    {q.options.map((o, j) => (
                      <div
                        key={j}
                        className={`review-option ${graded && j === key ? "right-answer" : selected === j && j !== key ? "wrong-answer" : ""}`}
                      >
                        <span>{String.fromCharCode(65 + j)}.</span>
                        <span>{o}</span>
                        {graded && j === key && <CheckCircle2 size={16} />}
                      </div>
                    ))}
                  </div>

                  {selected !== undefined && (
                    <p className="muted small">
                      Your answer: {String.fromCharCode(65 + selected)}.{" "}
                      {q.options[selected]}
                    </p>
                  )}

                  {q.explanation && (
                    <div className="explanation-box">
                      <strong>Explanation</strong>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="result-actions">
        <Link to="/" className="secondary-button">
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <Link
          to={`/exam/${data.exam?.id || ""}`}
          className="primary link-button"
        >
          <BookOpen size={16} /> Practice again
        </Link>
      </div>
    </div>
  );
}