import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, History, Trophy } from "lucide-react";
import api from "./api.js";

function ErrorText({ children }) {
  return children ? <div className="notice error">{children}</div> : null;
}

export default function ResultsPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/attempts/history/list")
      .then(({ data }) => { if (active) setAttempts(data.attempts || []); })
      .catch(err => { if (active) setError(err.response?.data?.message || "Could not load your results."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const submitted = attempts.filter(a => a.status === "submitted");
  const average = submitted.length
    ? Math.round(submitted.reduce((sum, a) => sum + Number(a.result?.percentage || 0), 0) / submitted.length)
    : 0;

  return <div className="page-stack">
    <div className="page-title-row">
      <div>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Dashboard</Link>
        <h1>My Results</h1>
        <p className="muted">Review your past attempts, scores, and unfinished tests.</p>
      </div>
    </div>

    <ErrorText>{error}</ErrorText>

    {loading ? <div className="loading">Loading your results…</div> : <>
      <section className="stats-grid">
        <div className="stat-card"><div className="stat-icon"><History size={19} /></div><div><div className="stat-label">Total attempts</div><div className="stat-value">{attempts.length}</div><div className="stat-caption">All practice sessions</div></div></div>
        <div className="stat-card"><div className="stat-icon"><CheckCircle2 size={19} /></div><div><div className="stat-label">Completed</div><div className="stat-value">{submitted.length}</div><div className="stat-caption">Submitted tests</div></div></div>
        <div className="stat-card"><div className="stat-icon"><Trophy size={19} /></div><div><div className="stat-label">Average score</div><div className="stat-value">{average}%</div><div className="stat-caption">Across submitted attempts</div></div></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Attempt history</h2><p className="muted">Your most recent sessions appear first.</p></div></div>
        {attempts.length ? <div className="history-list">
          {attempts.map(attempt => {
            const isSubmitted = attempt.status === "submitted";
            return <article className="history-row" key={attempt.id}>
              <div className="history-icon"><BookOpen size={18} /></div>
              <div className="history-info">
                <strong>{attempt.examTitle || "Practice test"}</strong>
                <span>{attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : "Date unavailable"}</span>
                {isSubmitted && <span>{attempt.result?.correct ?? 0} correct · {attempt.result?.incorrect ?? 0} incorrect · {attempt.result?.unanswered ?? 0} unanswered</span>}
              </div>
              <div className="history-score">
                {isSubmitted ? <><strong>{attempt.result?.percentage ?? 0}%</strong><span>{attempt.result?.score ?? 0} / {attempt.result?.maxScore ?? 0} marks</span></> : <span className="pill neutral"><Clock3 size={12} /> In progress</span>}
              </div>
              <Link to={`/attempt/${attempt.id}`} className="text-link">{isSubmitted ? "View review" : "Continue"} <ArrowRight size={15} /></Link>
            </article>;
          })}
        </div> : <div className="empty-state"><div className="empty-icon"><BookOpen size={25} /></div><h3>No attempts yet</h3><p>Start a practice test from your dashboard or the public library. Your results will appear here.</p><Link to="/" className="primary link-button">Find a test <ArrowRight size={16} /></Link></div>}
      </section>
    </>}
  </div>;
}
