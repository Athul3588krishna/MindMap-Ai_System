import { useEffect, useMemo, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { api } from './services/api'
import './App.css'

const tokenKey = 'mindmap_token'
const palette = ['#2dd4bf', '#f59e0b', '#60a5fa', '#f472b6', '#a3e635']

function subjectId(subject) {
  return subject?._id || subject?.id || ''
}

function topicId(topic) {
  return topic?._id || topic?.id || ''
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function daysLeft(date) {
  if (!date) return 0
  const target = new Date(`${formatDate(date)}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((target - today) / 86400000))
}

function completion(subject) {
  if (typeof subject.completion === 'number') return subject.completion
  if (!subject.topics?.length) return 0
  return Math.round((subject.topics.filter((topic) => topic.completed).length / subject.topics.length) * 100)
}

function AuthScreen({ onAuth }) {
  const [form, setForm] = useState({ email: 'admin@mindmap.com', password: 'admin123' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitAuth(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.login({
        email: form.email,
        password: form.password,
      })
      localStorage.setItem(tokenKey, data.token)
      onAuth(data.user)
    } catch (authError) {
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="login-card">
        <div className="brand auth-brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MindMap AI</strong>
            <small>Study planner</small>
          </div>
        </div>
        <p className="login-hint">Use admin@mindmap.com / admin123</p>
        <form className="auth-form" onSubmit={submitAuth}>
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          {error && <p className="error-text">{error}</p>}
          <button disabled={loading} type="submit">
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subjects, setSubjects] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [plan, setPlan] = useState(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [dailyHours, setDailyHours] = useState(3)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    examDate: formatDate(new Date()),
    priority: 'Medium',
  })
  const [topicForm, setTopicForm] = useState({
    title: '',
    difficulty: 'Medium',
    estimatedHours: 2,
  })
  const [syllabusText, setSyllabusText] = useState('')
  const [syllabusTopics, setSyllabusTopics] = useState([])
  const [ocrStatus, setOcrStatus] = useState('')
  const [syllabusImporting, setSyllabusImporting] = useState(false)
  const [notesTopic, setNotesTopic] = useState('')
  const [aiNotes, setAiNotes] = useState('')
  const [doubtQuestion, setDoubtQuestion] = useState('')
  const [doubtAnswer, setDoubtAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState('')

  const selectedSubject = subjects.find((subject) => subjectId(subject) === selectedSubjectId) || subjects[0]

  const stats = useMemo(() => {
    const allTopics = subjects.flatMap((subject) => subject.topics || [])
    return {
      allTopics,
      totalHours: analytics?.stats?.totalHours || 0,
      completedHours: analytics?.stats?.completedHours || 0,
      overall: analytics?.stats?.overallProgress || 0,
      weakSubjects: analytics?.weakSubjects || [],
      upcoming: analytics?.upcomingExams || [],
    }
  }, [analytics, subjects])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [subjectData, analyticsData, planData] = await Promise.all([
        api.getSubjects(),
        api.getAnalytics(),
        api.getLatestPlan(),
      ])
      const loadedSubjects = subjectData.subjects || []
      setSubjects(loadedSubjects)
      setAnalytics(analyticsData)
      setPlan(planData.plan)
      setSelectedSubjectId((current) => current || subjectId(loadedSubjects[0]))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function boot() {
      const token = localStorage.getItem(tokenKey)
      if (!token) {
        setBooting(false)
        return
      }

      try {
        const data = await api.me()
        setUser(data.user)
        setDailyHours(data.user.dailyStudyHours || 3)
        await loadData()
      } catch {
        localStorage.removeItem(tokenKey)
      } finally {
        setBooting(false)
      }
    }

    boot()
  }, [])

  async function handleAuthenticated(authUser) {
    setUser(authUser)
    setDailyHours(authUser.dailyStudyHours || 3)
    await loadData()
  }

  async function addSubject(event) {
    event.preventDefault()
    if (!subjectForm.name.trim()) return

    await api.createSubject({
      ...subjectForm,
      color: palette[subjects.length % palette.length],
    })
    setSubjectForm({ name: '', examDate: formatDate(new Date()), priority: 'Medium' })
    await loadData()
  }

  async function addTopic(event) {
    event.preventDefault()
    if (!topicForm.title.trim() || !selectedSubject) return

    await api.createTopic(subjectId(selectedSubject), {
      ...topicForm,
      estimatedHours: Number(topicForm.estimatedHours),
    })
    setTopicForm({ title: '', difficulty: 'Medium', estimatedHours: 2 })
    await loadData()
  }

  async function scanSyllabus(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setOcrStatus('Reading screenshot...')
    setSyllabusTopics([])

    try {
      const worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status) {
            const progress = message.progress ? ` ${Math.round(message.progress * 100)}%` : ''
            setOcrStatus(`${message.status}${progress}`)
          }
        },
      })
      const result = await worker.recognize(file)
      await worker.terminate()
      const text = result.data.text.trim()
      setSyllabusText(text)
      setOcrStatus(text ? 'Screenshot scanned' : 'No readable text found')

      if (text) {
        const preview = await api.previewSyllabus({ text })
        setSyllabusTopics(preview.topics || [])
      }
    } catch (scanError) {
      setError(scanError.message)
      setOcrStatus('Scan failed')
    }
  }

  async function previewSyllabusText() {
    if (!syllabusText.trim()) return
    const preview = await api.previewSyllabus({ text: syllabusText })
    setSyllabusTopics(preview.topics || [])
  }

  async function importSyllabusTopics() {
    if (!selectedSubject || !syllabusText.trim()) return

    setSyllabusImporting(true)
    setError('')

    try {
      await api.importSyllabus({
        subjectId: subjectId(selectedSubject),
        text: syllabusText,
        difficulty: topicForm.difficulty,
        estimatedHours: Number(topicForm.estimatedHours),
      })
      setSyllabusText('')
      setSyllabusTopics([])
      setOcrStatus('')
      await loadData()
    } catch (importError) {
      setError(importError.message)
    } finally {
      setSyllabusImporting(false)
    }
  }

  async function generateNotes() {
    if (!selectedSubject) return

    setAiLoading('notes')
    setError('')

    try {
      const data = await api.generateNotes({
        subjectId: subjectId(selectedSubject),
        topicTitle: notesTopic,
      })
      setAiNotes(data.notes || '')
    } catch (notesError) {
      setError(notesError.message)
    } finally {
      setAiLoading('')
    }
  }

  async function solveDoubt() {
    if (!selectedSubject || !doubtQuestion.trim()) return

    setAiLoading('doubt')
    setError('')

    try {
      const data = await api.solveDoubt({
        subjectId: subjectId(selectedSubject),
        question: doubtQuestion,
      })
      setDoubtAnswer(data.answer || '')
    } catch (doubtError) {
      setError(doubtError.message)
    } finally {
      setAiLoading('')
    }
  }

  async function toggleTopic(subject, topic) {
    await api.updateTopic(subjectId(subject), topicId(topic), { completed: !topic.completed })
    await loadData()
  }

  async function deleteSubject(id) {
    await api.deleteSubject(id)
    setSelectedSubjectId('')
    await loadData()
  }

  async function generatePlan() {
    const data = await api.generatePlan({ dailyStudyHours: Number(dailyHours) })
    setPlan(data.plan)
    const pref = await api.updatePreferences({ dailyStudyHours: Number(dailyHours) })
    setUser(pref.user)
  }

  function logout() {
    localStorage.removeItem(tokenKey)
    setUser(null)
    setSubjects([])
    setAnalytics(null)
    setPlan(null)
    setSelectedSubjectId('')
  }

  if (booting) {
    return <main className="auth-screen">Loading...</main>
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuthenticated} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MindMap AI</strong>
            <small>{user.email}</small>
          </div>
        </div>
        <nav>
          {['dashboard', 'subjects', 'planner', 'analytics'].map((view) => (
            <button
              className={activeView === view ? 'active' : ''}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {view}
            </button>
          ))}
        </nav>
        <div className="auth-panel">
          <span>{user.name}</span>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Smart Study Breakdown</p>
            <h1>{user.name.split(' ')[0]}'s exam cockpit</h1>
          </div>
          <div className="top-actions">
            <label>
              Daily hours
              <input
                type="number"
                min="1"
                max="12"
                value={dailyHours}
                onChange={(event) => setDailyHours(Number(event.target.value))}
              />
            </label>
            <div className="streak">
              <span>{user.streak || 0}</span>
              <small>day streak</small>
            </div>
          </div>
        </header>

        {error && <p className="error-banner">{error}</p>}
        {loading && <p className="muted">Syncing data...</p>}

        {activeView === 'dashboard' && (
          <section className="view-grid">
            <div className="metric-panel progress-panel">
              <span>Overall preparation</span>
              <strong>{stats.overall}%</strong>
              <div className="progress-track">
                <span style={{ width: `${stats.overall}%` }} />
              </div>
              <p>
                {stats.completedHours} of {stats.totalHours} study hours completed.
              </p>
            </div>
            <div className="metric-panel">
              <span>Subjects</span>
              <strong>{subjects.length}</strong>
              <p>{stats.allTopics.length} topics mapped.</p>
            </div>
            <div className="metric-panel">
              <span>Upcoming exam</span>
              <strong>{stats.upcoming[0]?.name || 'None'}</strong>
              <p>{stats.upcoming[0] ? `${stats.upcoming[0].daysLeft} days left` : 'Add a subject first.'}</p>
            </div>
            <section className="wide-panel">
              <div className="section-head">
                <h2>Today</h2>
                <button type="button" onClick={() => setActiveView('planner')}>Open planner</button>
              </div>
              <div className="task-list">
                {(plan?.days?.[0]?.sessions || []).map((session, index) => (
                  <article className="task-row" key={`${session.topic}-${index}`}>
                    <span className="task-icon">{session.type === 'Revision' ? 'R' : 'S'}</span>
                    <div>
                      <strong>{session.topic}</strong>
                      <small>{session.subject} - {session.hours}h - {session.difficulty}</small>
                    </div>
                  </article>
                ))}
                {!plan?.days?.[0]?.sessions?.length && <p className="empty-state">Generate a plan after adding subjects and topics.</p>}
              </div>
            </section>
            <section className="wide-panel">
              <div className="section-head">
                <h2>Weak areas</h2>
                <button type="button" onClick={() => setActiveView('analytics')}>Analyze</button>
              </div>
              <div className="weak-grid">
                {stats.weakSubjects.map((subject) => (
                  <article key={subject.id}>
                    <strong>{subject.name}</strong>
                    <span>{subject.completion}% complete</span>
                    <small>{subject.hardPending} hard topics pending</small>
                  </article>
                ))}
              </div>
              {!stats.weakSubjects.length && <p className="empty-state">No weak areas yet.</p>}
            </section>
          </section>
        )}

        {activeView === 'subjects' && (
          <section className="two-column">
            <div className="wide-panel">
              <div className="section-head">
                <h2>Subjects</h2>
                <span>{subjects.length} active</span>
              </div>
              <div className="subject-list">
                {subjects.map((subject) => (
                  <button
                    className={subjectId(selectedSubject) === subjectId(subject) ? 'subject-card selected' : 'subject-card'}
                    key={subjectId(subject)}
                    onClick={() => setSelectedSubjectId(subjectId(subject))}
                    type="button"
                  >
                    <span style={{ background: subject.color }} />
                    <strong>{subject.name}</strong>
                    <small>{daysLeft(subject.examDate)} days - {subject.priority}</small>
                    <em>{completion(subject)}%</em>
                  </button>
                ))}
                {!subjects.length && <p className="empty-state">No subjects saved yet.</p>}
              </div>
            </div>
            <div className="stack">
              <form className="form-panel" onSubmit={addSubject}>
                <h2>Add subject</h2>
                <input
                  placeholder="Subject name"
                  value={subjectForm.name}
                  onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })}
                />
                <input
                  type="date"
                  value={subjectForm.examDate}
                  onChange={(event) => setSubjectForm({ ...subjectForm, examDate: event.target.value })}
                />
                <select
                  value={subjectForm.priority}
                  onChange={(event) => setSubjectForm({ ...subjectForm, priority: event.target.value })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
                <button type="submit">Add subject</button>
              </form>
              {selectedSubject && (
                <>
                  <form className="form-panel" onSubmit={addTopic}>
                    <div className="section-head">
                      <h2>Add topic</h2>
                      <button className="danger" type="button" onClick={() => deleteSubject(subjectId(selectedSubject))}>Delete</button>
                    </div>
                    <input
                      placeholder="Topic or module"
                      value={topicForm.title}
                      onChange={(event) => setTopicForm({ ...topicForm, title: event.target.value })}
                    />
                    <select
                      value={topicForm.difficulty}
                      onChange={(event) => setTopicForm({ ...topicForm, difficulty: event.target.value })}
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={topicForm.estimatedHours}
                      onChange={(event) => setTopicForm({ ...topicForm, estimatedHours: event.target.value })}
                    />
                    <button type="submit">Add topic</button>
                  </form>
                  <section className="form-panel">
                    <h2>Syllabus screenshot</h2>
                    <label className="file-picker">
                      <input accept="image/*" type="file" onChange={scanSyllabus} />
                      Upload screenshot
                    </label>
                    {ocrStatus && <p className="muted">{ocrStatus}</p>}
                    <textarea
                      placeholder="Extracted syllabus text"
                      rows="6"
                      value={syllabusText}
                      onChange={(event) => setSyllabusText(event.target.value)}
                    />
                    <div className="inline-actions">
                      <button type="button" onClick={previewSyllabusText}>Preview topics</button>
                      <button disabled={syllabusImporting || !syllabusTopics.length} type="button" onClick={importSyllabusTopics}>
                        {syllabusImporting ? 'Importing...' : 'Import topics'}
                      </button>
                    </div>
                    {!!syllabusTopics.length && (
                      <div className="preview-list">
                        {syllabusTopics.slice(0, 10).map((topic) => (
                          <span key={topic}>{topic}</span>
                        ))}
                        {syllabusTopics.length > 10 && <small>+{syllabusTopics.length - 10} more</small>}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
            <div className="wide-panel full-span">
              <h2>{selectedSubject?.name || 'Topics'}</h2>
              <div className="topic-table">
                {(selectedSubject?.topics || []).map((topic) => (
                  <label key={topicId(topic)} className={topic.completed ? 'topic-row done' : 'topic-row'}>
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={() => toggleTopic(selectedSubject, topic)}
                    />
                    <span>{topic.title}</span>
                    <small>{topic.difficulty}</small>
                    <em>{topic.estimatedHours}h</em>
                  </label>
                ))}
                {selectedSubject && !selectedSubject.topics?.length && <p className="empty-state">No topics added for this subject.</p>}
              </div>
            </div>
            {selectedSubject && (
              <div className="ai-grid full-span">
                <section className="wide-panel">
                  <div className="section-head">
                    <h2>AI notes</h2>
                    <button disabled={aiLoading === 'notes'} type="button" onClick={generateNotes}>
                      {aiLoading === 'notes' ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  <select value={notesTopic} onChange={(event) => setNotesTopic(event.target.value)}>
                    <option value="">Overall subject</option>
                    {(selectedSubject.topics || []).map((topic) => (
                      <option key={topicId(topic)} value={topic.title}>{topic.title}</option>
                    ))}
                  </select>
                  {aiNotes ? <pre className="ai-output">{aiNotes}</pre> : <p className="empty-state">Generate notes from this subject and its topics.</p>}
                </section>
                <section className="wide-panel">
                  <div className="section-head">
                    <h2>Doubt solving</h2>
                    <button disabled={aiLoading === 'doubt'} type="button" onClick={solveDoubt}>
                      {aiLoading === 'doubt' ? 'Solving...' : 'Ask'}
                    </button>
                  </div>
                  <textarea
                    placeholder="Type your doubt"
                    rows="5"
                    value={doubtQuestion}
                    onChange={(event) => setDoubtQuestion(event.target.value)}
                  />
                  {doubtAnswer ? <pre className="ai-output">{doubtAnswer}</pre> : <p className="empty-state">Ask a doubt using this subject as context.</p>}
                </section>
              </div>
            )}
          </section>
        )}

        {activeView === 'planner' && (
          <section className="planner-list">
            <div className="section-head">
              <h2>Generated study plan</h2>
              <button type="button" onClick={generatePlan}>Generate plan</button>
            </div>
            {(plan?.days || []).map((day) => (
              <article className="day-plan" key={day.label}>
                <div>
                  <strong>{day.label}</strong>
                  <small>{day.totalHours} hours</small>
                </div>
                <div className="task-list">
                  {day.sessions.map((session, index) => (
                    <div className="task-row" key={`${day.label}-${session.topic}-${index}`}>
                      <span className="task-icon">{session.type === 'Revision' ? 'R' : 'S'}</span>
                      <div>
                        <strong>{session.topic}</strong>
                        <small>{session.subject} - {session.hours}h</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!plan?.days?.length && <p className="empty-state">Add pending topics and generate your first plan.</p>}
          </section>
        )}

        {activeView === 'analytics' && (
          <section className="analytics-grid">
            <div className="chart-panel">
              <h2>Subject completion</h2>
              {subjects.map((subject) => (
                <div className="bar-row" key={subjectId(subject)}>
                  <span>{subject.name}</span>
                  <div><i style={{ width: `${completion(subject)}%`, background: subject.color }} /></div>
                  <em>{completion(subject)}%</em>
                </div>
              ))}
              {!subjects.length && <p className="empty-state">No analytics until you add subjects.</p>}
            </div>
            <div className="chart-panel">
              <h2>Study workload</h2>
              <div className="donut" style={{ '--value': `${stats.overall * 3.6}deg` }}>
                <strong>{stats.overall}%</strong>
              </div>
              <p>{stats.totalHours - stats.completedHours} hours left across pending topics.</p>
            </div>
            <div className="chart-panel full-span">
              <h2>Upcoming exams</h2>
              <div className="exam-strip">
                {stats.upcoming.map((subject) => (
                  <article key={subject.id}>
                    <strong>{subject.name}</strong>
                    <span>{subject.daysLeft} days</span>
                    <small>{subject.priority} priority</small>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
