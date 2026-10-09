import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { BookOpen, Clock3, FileUp, LayoutDashboard, LogOut, Plus, Trash2, CheckCircle2, CircleHelp, ArrowLeft, ArrowRight, Flag, Timer, FileText, Sparkles } from "lucide-react";
import api from "./api.js";

function ErrorText({ children }) { return children ? <div className="notice error">{children}</div> : null; }
function Loading() { return <div className="loading">Loading your workspace…</div>; }
function Protected({ user, children }) { return user ? children : <Navigate to="/login" replace />; }

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("exam_token");
    if (!token) { setChecking(false); return; }
    api.get("/auth/me").then(r => setUser(r.data.user)).catch(() => localStorage.removeItem("exam_token")).finally(() => setChecking(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("exam_token");
    setUser(null);
    navigate("/login");
  };
  const login = data => { localStorage.setItem("exam_token", data.token); setUser(data.user); navigate("/"); };
  if (checking) return <Loading />;

  return <div className="app-shell">
    {user && <header className="topbar">
      <Link className="brand" to="/"><span className="brand-icon"><BookOpen size={21}/></span><span>PrepSpace</span></Link>
      <nav><Link to="/">Dashboard</Link><Link to="/upload">Create test</Link></nav>
      <div className="user-menu"><span className="avatar">{user.name?.slice(0,1).toUpperCase()}</span><span className="user-name">{user.name}</span><button className="icon-button" title="Log out" onClick={logout}><LogOut size={18}/></button></div>
    </header>}
    <main className={user ? "main-content" : "auth-main"}>
      {toast && <div className="toast">{toast}<button onClick={() => setToast("")}>×</button></div>}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace/> : <AuthPage mode="login" onAuth={login}/>}/>
        <Route path="/register" element={user ? <Navigate to="/" replace/> : <AuthPage mode="register" onAuth={login}/>}/>
        <Route path="/" element={<Protected user={user}><Dashboard/></Protected>}/>
        <Route path="/upload" element={<Protected user={user}><UploadPage onCreated={() => { setToast("Your test is ready."); navigate("/"); }}/></Protected>}/>
        <Route path="/exam/:id" element={<Protected user={user}><ExamPage/></Protected>}/>
        <Route path="/attempt/:id" element={<Protected user={user}><AttemptPage/></Protected>}/>
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace/>}/>
      </Routes>
    </main>
    {user && <footer className="footer">Made for focused practice <span>•</span> Your tests are private to your account</footer>}
  </div>;
}

function AuthPage({ mode, onAuth }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  const submit = async e => {
    e.preventDefault(); setError(""); setBusy(true);
    try { const { data } = await api.post(`/auth/${register ? "register" : "login"}`, form); onAuth(data); }
    catch (err) { setError(err.response?.data?.message || "Could not connect to the server. Check that the backend is running."); }
    finally { setBusy(false); }
  };
  return <div className="auth-layout">
    <section className="auth-story"><div className="brand light"><span className="brand-icon"><BookOpen size={21}/></span><span>PrepSpace</span></div><div className="auth-story-copy"><span className="eyebrow light-eyebrow">YOUR PERSONAL EXAM STUDIO</span><h1>Turn every paper into a chance to improve.</h1><p>Practice at your own pace, simulate exam conditions, and understand your progress after every attempt.</p><div className="story-points"><span><CheckCircle2 size={17}/> Timed practice sessions</span><span><CheckCircle2 size={17}/> Results and answer review</span><span><CheckCircle2 size={17}/> Your papers, your workspace</span></div></div><div className="story-bottom">Learn consistently. Improve confidently.</div></section>
    <section className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">{register ? "GET STARTED" : "WELCOME BACK"}</span><h2>{register ? "Create your account" : "Sign in to PrepSpace"}</h2><p className="muted">{register ? "Your next practice session starts here." : "Pick up where your preparation left off."}</p><ErrorText>{error}</ErrorText>
      {register && <label>Full name<input required minLength="2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}
      <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
      <label>Password<input required minLength="8" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/></label>
      <button className="primary full" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"} <ArrowRight size={17}/></button>
      <p className="auth-switch">{register ? "Already have an account?" : "New to PrepSpace?"} <Link to={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</Link></p>
    </form></section>
  </div>;
}

function Dashboard() {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [e, a] = await Promise.all([api.get("/exams"), api.get("/attempts/history/list")]);
      setExams(e.data.exams); setAttempts(a.data.attempts);
    } catch (err) { setError(err.response?.data?.message || "Could not load your dashboard."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const submitted = attempts.filter(a=>a.status==="submitted");
  const avg = submitted.length ? Math.round(submitted.reduce((sum,a)=>sum+(a.result?.percentage||0),0)/submitted.length) : 0;
  const remove = async id => {
    if (!confirm("Delete this test? In-progress attempts may also be removed.")) return;
    try { await api.delete(`/exams/${id}`); refresh(); } catch (e) { setError(e.response?.data?.message || "Could not delete test."); }
  };
  if (loading) return <Loading/>;
  return <div className="page-stack">
    <section className="welcome-row"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Ready to make progress?</h1><p className="muted">Create a test from a question paper, then practice under timed conditions.</p></div><Link to="/upload" className="primary link-button"><Plus size={18}/> Create a test</Link></section>
    <ErrorText>{error}</ErrorText>
    <section className="stats-grid">
      <Stat icon={<FileText/>} label="My tests" value={exams.length} caption="Papers ready to practice"/>
      <Stat icon={<CheckCircle2/>} label="Completed attempts" value={submitted.length} caption="Tests submitted"/>
      <Stat icon={<Sparkles/>} label="Average score" value={`${avg}%`} caption="Across graded attempts"/>
    </section>
    <section className="section-block"><div className="section-heading"><div><h2>Your tests</h2><p className="muted">Upload a paper or continue practicing.</p></div><Link to="/upload" className="text-link">+ New test</Link></div>
      {exams.length ? <div className="exam-grid">{exams.map(exam=><article className="exam-card" key={exam.id}><div className="card-icon"><BookOpen size={21}/></div><div className="exam-card-top"><span className="pill">{exam.questionCount} questions</span><button className="icon-button danger-icon" onClick={()=>remove(exam.id)} title="Delete test"><Trash2 size={17}/></button></div><h3>{exam.title}</h3><div className="card-meta"><span><Clock3 size={15}/> {exam.durationMinutes} min</span><span><CheckCircle2 size={15}/> {exam.attemptCount} attempts</span></div><Link to={`/exam/${exam.id}`} className="secondary-button">Open test <ArrowRight size={16}/></Link></article>)}</div> : <div className="empty-state"><div className="empty-icon"><FileUp size={26}/></div><h3>Your first practice test starts here</h3><p>Upload a question paper PDF. We'll extract what we can, then you can correct and save the questions.</p><Link to="/upload" className="primary link-button"><Plus size={17}/> Create your first test</Link></div>}
    </section>
    <section className="section-block"><div className="section-heading"><div><h2>Recent attempts</h2><p className="muted">Your latest exam sessions.</p></div></div>
      {attempts.length ? <div className="history-list">{attempts.slice(0,6).map(a=><div className="history-row" key={a.id}><div className="history-icon"><BookOpen size={18}/></div><div className="history-info"><strong>{a.examTitle}</strong><span>{new Date(a.startedAt).toLocaleString()}</span></div><div className="history-score">{a.status==="submitted" ? `${a.result?.percentage ?? 0}%` : <span className="pill neutral">In progress</span>}</div><Link to={`/attempt/${a.id}`} className="text-link">{a.status==="submitted"?"View result":"Continue"} <ArrowRight size={15}/></Link></div>)}</div> : <p className="muted empty-note">Your completed and in-progress sessions will appear here.</p>}
    </section>
  </div>;
}

function Stat({ icon, label, value, caption }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></div>;
}

function UploadPage({ onCreated }) {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [marks, setMarks] = useState(1);
  const [negative, setNegative] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stage, setStage] = useState("upload");

  const parse = async e => {
    e.preventDefault(); if (!file) { setError("Choose a PDF first."); return; }
    setError(""); setNotice(""); setBusy(true);
    try {
      const body = new FormData(); body.append("paper", file);
      const { data } = await api.post("/papers/parse", body, { headers: { "Content-Type": "multipart/form-data" } });
      setRawText(data.extractedText || "");
      setQuestions(data.questions || []);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "));
      setNotice(data.questions?.length ? `Detected ${data.questions.length} possible MCQs across ${data.pageCount} page(s). Please review every question and answer key.` : `Text was extracted from ${data.pageCount} page(s), but no MCQs were detected confidently. You can add questions manually below.`);
      setStage("edit");
    } catch (err) { setError(err.response?.data?.message || "PDF parsing failed. Try a text-based PDF."); }
    finally { setBusy(false); }
  };

  const updateQ = (index, patch) => setQuestions(old=>old.map((q,i)=>i===index?{...q,...patch}:q));
  const addQ = () => setQuestions(old=>[...old,{text:"",options:["","","",""],correctIndex:null,explanation:""}]);
  const deleteQ = index => setQuestions(old=>old.filter((_,i)=>i!==index));
  const updateOption = (qi, oi, value) => setQuestions(old=>old.map((q,i)=>i===qi?{...q,options:q.options.map((o,j)=>j===oi?value:o)}:q));
  const addOption = qi => setQuestions(old=>old.map((q,i)=>i===qi?{...q,options:[...q.options,""]}:q));
  const removeOption = (qi, oi) => setQuestions(old=>old.map((q,i)=>i===qi?{...q,options:q.options.filter((_,j)=>j!==oi),correctIndex:q.correctIndex===oi?null:q.correctIndex>oi?q.correctIndex-1:q.correctIndex}:q));

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const { data } = await api.post("/exams", { title, durationMinutes:Number(duration), marksPerQuestion:Number(marks), negativeMarks:Number(negative), questions });
      onCreated(data.exam);
    } catch (err) { setError(err.response?.data?.message || "Could not save test. Check all questions and options."); }
    finally { setSaving(false); }
  };

  return <div className="page-stack narrow-page">
    <div className="page-title-row"><div><Link to="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link><h1>Create a practice test</h1><p className="muted">Upload a paper, review the extracted MCQs, and set your exam conditions.</p></div></div>
    <div className="stepper"><div className={stage==="upload"?"step active":"step done"}><span>1</span> Upload paper</div><div className="step-line"/><div className={stage==="edit"?"step active":"step"}><span>2</span> Review questions</div><div className="step-line"/><div className="step"><span>3</span> Save test</div></div>
    <ErrorText>{error}</ErrorText>
    {stage==="upload" ? <form className="panel upload-panel" onSubmit={parse}><div className="panel-heading"><div className="panel-icon"><FileUp size={21}/></div><div><h2>Upload your question paper</h2><p className="muted">PDF only · Maximum 12 MB</p></div></div>
      <label className="dropzone"><input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><span className="drop-icon"><FileUp size={26}/></span><strong>{file ? file.name : "Choose a PDF to upload"}</strong><span className="muted">{file ? `${(file.size/1024/1024).toFixed(2)} MB selected` : "Click here to browse your files"}</span><span className="file-hint">Your PDF is processed for extraction and is not permanently stored by this MVP.</span></label>
      <div className="info-box"><CircleHelp size={18}/><p><strong>Best results:</strong> use a text-based PDF with questions numbered and options labelled A), B), C), D). Scanned PDFs need OCR, which is not enabled yet.</p></div>
      <button className="primary full" disabled={!file||busy}>{busy ? "Extracting questions…" : "Extract questions"} <ArrowRight size={17}/></button>
      <button type="button" className="secondary-button full" onClick={()=>{setTitle("My practice test");setQuestions([{text:"",options:["","","",""],correctIndex:null,explanation:""}]);setStage("edit");}}>Or create questions manually</button>
    </form> : <>
      {notice && <div className="notice success"><CheckCircle2 size={18}/>{notice}</div>}
      {rawText && <details className="panel raw-panel"><summary>View extracted PDF text</summary><pre>{rawText}</pre></details>}
      <div className="panel settings-panel"><div className="panel-heading"><div className="panel-icon"><Timer size={21}/></div><div><h2>Test settings</h2><p className="muted">You can change these before each attempt.</p></div></div>
        <div className="form-grid"><label>Test title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength="150" placeholder="e.g. DSA Mock Test 1" required/></label><label>Duration<select value={duration} onChange={e=>setDuration(e.target.value)}>{[15,30,45,60,90,120,180,240,300,360].map(n=><option key={n} value={n}>{n<60?`${n} minutes`:`${n/60} hour${n===60?"":"s"}`}</option>)}</select></label><label>Marks per correct answer<input type="number" min="0" max="100" step="0.25" value={marks} onChange={e=>setMarks(e.target.value)}/></label><label>Negative marks per wrong answer<input type="number" min="0" max="100" step="0.25" value={negative} onChange={e=>setNegative(e.target.value)}/></label></div>
      </div>
      <div className="editor-heading"><div><h2>Review questions</h2><p className="muted">Select the correct answer key for each question. Leave it unselected if unknown.</p></div><button className="secondary-button" onClick={addQ}><Plus size={16}/> Add question</button></div>
      {questions.map((q,qi)=><article className="panel question-editor" key={qi}><div className="question-editor-head"><span className="question-number">Q{qi+1}</span><span className="muted small">{q.options.length} options</span><button className="icon-button danger-icon" onClick={()=>deleteQ(qi)} title="Remove question"><Trash2 size={17}/></button></div>
        <label>Question text<textarea rows="2" value={q.text} onChange={e=>updateQ(qi,{text:e.target.value})} placeholder="Enter the question…"/></label>
        <div className="option-editor-list">{q.options.map((opt,oi)=><div className="option-editor" key={oi}><button type="button" className={`answer-key ${q.correctIndex===oi?"selected":""}`} onClick={()=>updateQ(qi,{correctIndex:q.correctIndex===oi?null:oi})} title="Mark as correct answer">{String.fromCharCode(65+oi)}</button><input value={opt} onChange={e=>updateOption(qi,oi,e.target.value)} placeholder={`Option ${String.fromCharCode(65+oi)}`}/>{q.options.length>2&&<button className="mini-delete" onClick={()=>removeOption(qi,oi)} title="Remove option">×</button>}</div>)}</div>
        {q.options.length<6&&<button className="text-link add-option" onClick={()=>addOption(qi)}><Plus size={14}/> Add option</button>}
        <label className="explanation-label">Explanation (optional)<textarea rows="2" value={q.explanation||""} onChange={e=>updateQ(qi,{explanation:e.target.value})} placeholder="Why is this the correct answer?"/></label>
        <div className="answer-key-hint"><CircleHelp size={14}/> Click a letter to set the correct answer. {q.correctIndex===null||q.correctIndex===undefined?"No answer key set.":"Correct answer: "+String.fromCharCode(65+q.correctIndex)}</div>
      </article>)}
      {!questions.length&&<div className="empty-state"><p>No questions yet. Add one manually.</p><button className="primary" onClick={addQ}><Plus size={16}/> Add question</button></div>}
      <div className="save-bar"><button className="secondary-button" onClick={()=>setStage("upload")}><ArrowLeft size={16}/> Back</button><button className="primary" disabled={saving||!title.trim()||questions.length===0} onClick={save}>{saving?"Saving test…":"Save test"} <CheckCircle2 size={17}/></button></div>
    </>}
  </div>;
}

function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(()=>{api.get(`/exams/${id}`).then(r=>setExam(r.data.exam)).catch(e=>setError(e.response?.data?.message||"Could not load test."));},[id]);
  const start = async () => {
    setBusy(true);setError("");
    try { const {data}=await api.post(`/attempts/start/${id}`);navigate(`/attempt/${data.attempt.id}`); }
    catch(e){setError(e.response?.data?.message||"Could not start test.");}
    finally{setBusy(false);}
  };
  if(error)return <div className="page-stack"><ErrorText>{error}</ErrorText><Link to="/" className="text-link">Back to dashboard</Link></div>;
  if(!exam)return <Loading/>;
  const graded=exam.questions.filter(q=>q.correctIndex!==null&&q.correctIndex!==undefined).length;
  return <div className="page-stack narrow-page"><Link to="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link><section className="panel exam-intro"><div className="large-book"><BookOpen size={28}/></div><span className="eyebrow">PRACTICE TEST</span><h1>{exam.title}</h1><p className="muted">Take this test in a focused, timed session. Your answers are saved as you go.</p><div className="exam-detail-grid"><div><Clock3/><strong>{exam.durationMinutes} min</strong><span>Time limit</span></div><div><CircleHelp/><strong>{exam.questions.length}</strong><span>Questions</span></div><div><CheckCircle2/><strong>{graded}/{exam.questions.length}</strong><span>Answer keys set</span></div></div><div className="info-box"><CircleHelp size={18}/><p>{graded===exam.questions.length?"All questions have answer keys. Your score will be calculated automatically.":`${exam.questions.length-graded} question(s) do not have a confirmed answer key. Those questions will be shown as ungraded and excluded from the maximum score.`}</p></div><button className="primary full" onClick={start} disabled={busy}>{busy?"Starting…":"Start test"} <ArrowRight size={17}/></button></section></div>;
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
    const {data:d}=await api.get(`/attempts/${id}`);
    setData(d);setAnswers(d.attempt.answers||{});
    if(d.attempt.status==="submitted"){setSubmitted(true);return;}
    setRemaining(Math.max(0,Math.floor((new Date(d.attempt.deadlineAt).getTime()-Date.now())/1000)));
  },[id]);
  useEffect(()=>{load().catch(e=>setError(e.response?.data?.message||"Could not load attempt."));},[load]);

  const submit = useCallback(async (automatic=false) => {
    if(submitted)return;
    setSaving(true);setError("");
    try {
      await api.put(`/attempts/${id}/answers`,{answers}).catch(e=>{if(e.response?.status!==409)throw e;});
      const {data:d}=await api.post(`/attempts/${id}/submit`);
      setSubmitted(true);
      const full=await api.get(`/attempts/${id}`);
      setData(full.data);setAnswers(full.data.attempt.answers||answers);
    } catch(e) {setError(e.response?.data?.message||"Submission failed. Please try again.");}
    finally {setSaving(false);setShowConfirm(false);}
  },[id,answers,submitted]);

  useEffect(()=>{
    if(!data||submitted||data.attempt.status==="submitted")return;
    const tick=()=>{const seconds=Math.max(0,Math.floor((new Date(data.attempt.deadlineAt).getTime()-Date.now())/1000));setRemaining(seconds);if(seconds<=0)submit(true);};
    tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[data,submitted,submit]);

  const saveAnswers = async nextAnswers => {
    setAnswers(nextAnswers);
    setSaving(true);
    try { await api.put(`/attempts/${id}/answers`,{answers:nextAnswers}); }
    catch(e){setError(e.response?.data?.message||"Could not save answer.");}
    finally{setSaving(false);}
  };

  if(error&&!data)return <div className="page-stack"><ErrorText>{error}</ErrorText><Link to="/" className="text-link">Dashboard</Link></div>;
  if(!data)return <Loading/>;
  if(submitted||data.attempt.status==="submitted")return <ResultView data={data} answers={answers}/>;
  const questions=data.exam.questions;
  const q=questions[current];
  const answered=Object.keys(answers).length;
  const formatTime=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const selectOption=value=>saveAnswers({...answers,[q.id]:value});
  const clearAnswer=()=>{const next={...answers};delete next[q.id];saveAnswers(next);};
  const submitClick=()=>setShowConfirm(true);

  return <div className="test-shell">
    <header className="test-topbar"><Link to="/" className="brand"><span className="brand-icon"><BookOpen size={20}/></span><span>PrepSpace</span></Link><div className="test-top-title"><strong>{data.exam.title}</strong><span>{questions.length} questions</span></div><div className={`timer-box ${remaining<300?"timer-warning":""}`}><Clock3 size={18}/><div><strong>{formatTime(remaining)}</strong><span>Time left</span></div></div></header>
    <div className="test-body"><section className="test-question-panel"><div className="test-progress-row"><span>Question {current+1} of {questions.length}</span><span>{answered}/{questions.length} answered</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${((current+1)/questions.length)*100}%`}}/></div><div className="question-content"><div className="question-title-row"><span className="question-number large-q">Q{current+1}</span><button className={`review-button ${marked.includes(q.id)?"is-marked":""}`} onClick={()=>setMarked(m=>m.includes(q.id)?m.filter(x=>x!==q.id):[...m,q.id])}><Flag size={16}/>{marked.includes(q.id)?"Marked for review":"Mark for review"}</button></div><h2>{q.text}</h2><div className="answer-options">{q.options.map((opt,i)=><button key={i} className={`answer-option ${answers[q.id]===i?"chosen":""}`} onClick={()=>selectOption(i)}><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{opt}</span><span className="option-radio">{answers[q.id]===i&&<span/>}</span></button>)}</div></div><div className="test-question-footer"><button className="secondary-button" disabled={current===0} onClick={()=>setCurrent(c=>c-1)}><ArrowLeft size={16}/> Previous</button><button className="clear-answer" onClick={clearAnswer} disabled={answers[q.id]===undefined}>Clear answer</button>{current<questions.length-1?<button className="primary" onClick={()=>setCurrent(c=>c+1)}>Save & Next <ArrowRight size={16}/></button>:<button className="primary" onClick={submitClick}>Submit test <CheckCircle2 size={16}/></button>}</div>{error&&<ErrorText>{error}</ErrorText>}</section>
      <aside className="question-sidebar"><div className="sidebar-heading"><h3>Question palette</h3><span className="muted">{questions.length} total</span></div><div className="palette-legend"><span><i className="legend-dot answered-dot"/> Answered</span><span><i className="legend-dot review-dot"/> Review</span><span><i className="legend-dot"/> Not answered</span></div><div className="question-palette">{questions.map((item,i)=><button key={item.id} className={`${i===current?"active":""} ${answers[item.id]!==undefined?"answered":""} ${marked.includes(item.id)?"marked":""}`} onClick={()=>setCurrent(i)}>{i+1}</button>)}</div><div className="sidebar-summary"><div><span>Answered</span><strong>{answered}</strong></div><div><span>Unanswered</span><strong>{questions.length-answered}</strong></div><div><span>For review</span><strong>{marked.length}</strong></div></div><button className="primary full" onClick={submitClick}>Submit test <ArrowRight size={16}/></button><p className="autosave-note">{saving?"Saving your answer…":"Answers are saved to your account."}</p></aside>
    </div>
    {showConfirm&&<div className="modal-backdrop"><div className="confirm-modal"><div className="modal-icon"><CheckCircle2 size={24}/></div><h2>Submit your test?</h2><p>You have answered {answered} of {questions.length} questions. You cannot change your answers after submission.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>setShowConfirm(false)}>Keep working</button><button className="primary" disabled={saving} onClick={()=>submit(false)}>{saving?"Submitting…":"Submit test"}</button></div></div></div>}
  </div>;
}

function ResultView({data,answers}) {
  const r=data.attempt.result||{};
  const qs=data.exam?.questions||[];
  const [showReview,setShowReview]=useState(true);
  const duration=Math.max(0,r.timeTakenSeconds||0);
  const timeText=`${Math.floor(duration/60)}m ${duration%60}s`;
  return <div className="page-stack narrow-page result-page"><div className="result-hero"><div className="result-check"><CheckCircle2 size={30}/></div><span className="eyebrow light-eyebrow">TEST COMPLETED</span><h1>{data.exam?.title||"Your result"}</h1><p>Your attempt has been submitted. Here's how you did.</p><div className="score-ring"><div><strong>{r.percentage??0}%</strong><span>Score</span></div></div><div className="score-summary"><div><strong>{r.score??0}</strong><span>Marks earned</span></div><div><strong>{r.maxScore??0}</strong><span>Maximum marks</span></div><div><strong>{timeText}</strong><span>Time taken</span></div></div></div>
    <div className="stats-grid result-stats"><Stat icon={<CheckCircle2/>} label="Correct" value={r.correct??0} caption="Correct answers"/><Stat icon={<CircleHelp/>} label="Incorrect" value={r.incorrect??0} caption="Wrong answers"/><Stat icon={<Clock3/>} label="Unanswered" value={r.unanswered??0} caption={`${r.ungraded??0} ungraded question(s)`}/></div>
    <section className="section-block"><div className="section-heading"><div><h2>Answer review</h2><p className="muted">Compare your choices with the answer key.</p></div><button className="secondary-button" onClick={()=>setShowReview(s=>!s)}>{showReview?"Hide review":"Show review"}</button></div>
      {showReview&&<div className="review-list">{qs.map((q,i)=>{const selected=answers[q.id];const key=q.correctIndex;const graded=key!==null&&key!==undefined;return <article className="panel review-card" key={q.id}><div className="review-card-title"><span className="question-number">Q{i+1}</span><span className={`pill ${!graded?"neutral":selected===key?"good":"bad"}`}>{!graded?"Ungraded":selected===key?"Correct":selected===undefined?"Unanswered":"Incorrect"}</span></div><h3>{q.text}</h3><div className="review-options">{q.options.map((o,j)=><div key={j} className={`review-option ${graded&&j===key?"right-answer":selected===j&&j!==key?"wrong-answer":""}`}><span>{String.fromCharCode(65+j)}.</span><span>{o}</span>{graded&&j===key&&<CheckCircle2 size={16}/>}</div>)}</div>{selected!==undefined&&<p className="muted small">Your answer: {String.fromCharCode(65+selected)}. {q.options[selected]}</p>}{q.explanation&&<div className="explanation-box"><strong>Explanation</strong><p>{q.explanation}</p></div>}</article>})}</div>}
    </section><div className="result-actions"><Link to="/" className="secondary-button"><LayoutDashboard size={16}/> Dashboard</Link><Link to={`/exam/${data.exam?.id||""}`} className="primary link-button"><BookOpen size={16}/> Practice again</Link></div>
  </div>;
}
