import { useMemo, useState } from 'react'
import './App.css'

const today = new Date()

const initialSubjects = [
  {
    id: 's1',
    name: 'Advanced Computer Networks',
    examDate: '2026-06-25',
    priority: 'High',
    color: '#2dd4bf',
    topics: [
      { id: 't1', title: 'TCP/IP', difficulty: 'Medium', estimatedHours: 3, completed: false },
      { id: 't2', title: 'DNS and routing', difficulty: 'Easy', estimatedHours: 2, completed: true },
      { id: 't3', title: 'Congestion control', difficulty: 'Hard', estimatedHours: 5, completed: false },
    ],
  },
  {
    id: 's2',
    name: 'Data Mining',
    examDate: '2026-06-18',
    priority: 'Medium',
    color: '#f59e0b',
    topics: [
      { id: 't4', title: 'Classification', difficulty: 'Medium', estimatedHours: 4, completed: true },
      { id: 't5', title: 'Clustering', difficulty: 'Hard', estimatedHours: 5, completed: false },
    ],
  },
  {
    id: 's3',
    name: 'Software Engineering',
    examDate: '2026-07-03',
    priority: 'Low',
    color: '#60a5fa',
    topics: [
      { id: 't6', title: 'Agile models', difficulty: 'Easy', estimatedHours: 2, completed: false },
      { id: 't7', title: 'Testing strategies', difficulty: 'Medium', estimatedHours: 3, completed: false },
    ],
  },
]

const difficultyWeight = { Easy: 1, Medium: 1.25, Hard: 1.7 }
const priorityWeight = { Low: 1, Medium: 1.2, High: 1.5 }

function daysLeft(date) {
  const target = new Date(`${date}T00:00:00`)
  return Math.max(1, Math.ceil((target - today) / 86400000))
}

function completion(subject) {
  if (!subject.topics.length) return 0
  return Math.round((subject.topics.filter((topic) => topic.completed).length / subject.topics.length) * 100)
}

function makePlan(subjects, dailyHours) {
  const queue = subjects
    .flatMap((subject) =>
      subject.topics
        .filter((topic) => !topic.completed)
        .map((topic) => ({
          subject: subject.name,
          topic: topic.title,
          difficulty: topic.difficulty,
          remaining: topic.estimatedHours,
          score:
            difficultyWeight[topic.difficulty] *
            priorityWeight[subject.priority] *
            (1 + 18 / daysLeft(subject.examDate)),
        })),
    )
    .sort((a, b) => b.score - a.score)

  const days = []
  let day = 0

  while (queue.some((item) => item.remaining > 0) && day < 21) {
    let capacity = dailyHours
    const sessions = []

    for (const item of queue) {
      if (capacity <= 0 || item.remaining <= 0) continue
      const hours = Math.min(capacity, item.remaining, item.difficulty === 'Hard' ? 2 : 1.5)
      item.remaining = Number((item.remaining - hours).toFixed(1))
      capacity = Number((capacity - hours).toFixed(1))
      sessions.push({ ...item, hours, type: 'Study' })
    }

    if (day > 0 && day % 3 === 0 && sessions.length) {
      sessions.push({
        subject: 'Revision',
        topic: 'Active recall and formula review',
        difficulty: 'Medium',
        hours: 1,
        type: 'Revision',
      })
    }

    if (sessions.length) days.push({ label: day === 0 ? 'Today' : `Day ${day + 1}`, sessions })
    day += 1
  }

  return days
}

function App() {
  const [user, setUser] = useState({ name: 'Aarav Student', email: 'aarav@example.com', streak: 7 })
  const [subjects, setSubjects] = useState(initialSubjects)
  const [activeView, setActiveView] = useState('dashboard')
  const [dailyHours, setDailyHours] = useState(3)
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjects[0].id)
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    examDate: '2026-06-30',
    priority: 'Medium',
  })
  const [topicForm, setTopicForm] = useState({
    title: '',
    difficulty: 'Medium',
    estimatedHours: 2,
  })
  const [notes, setNotes] = useState([
    { id: 'n1', title: 'Network layer summary.pdf', subject: 'Advanced Computer Networks' },
  ])
  const [noteForm, setNoteForm] = useState({ title: '', subject: initialSubjects[0].name })

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) || subjects[0]

  const stats = useMemo(() => {
    const allTopics = subjects.flatMap((subject) => subject.topics)
    const totalHours = allTopics.reduce((sum, topic) => sum + Number(topic.estimatedHours), 0)
    const completedHours = allTopics
      .filter((topic) => topic.completed)
      .reduce((sum, topic) => sum + Number(topic.estimatedHours), 0)
    const overall = totalHours ? Math.round((completedHours / totalHours) * 100) : 0
    const weakSubjects = subjects
      .map((subject) => ({
        ...subject,
        progress: completion(subject),
        hardPending: subject.topics.filter((topic) => topic.difficulty === 'Hard' && !topic.completed).length,
      }))
      .filter((subject) => subject.progress < 50 || subject.hardPending)
      .sort((a, b) => a.progress - b.progress || daysLeft(a.examDate) - daysLeft(b.examDate))

    return {
      allTopics,
      totalHours,
      completedHours,
      overall,
      weakSubjects,
      upcoming: [...subjects].sort((a, b) => new Date(a.examDate) - new Date(b.examDate)),
    }
  }, [subjects])

  const plan = useMemo(() => makePlan(subjects, Number(dailyHours)), [subjects, dailyHours])

  function handleLogin(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setUser({
      name: form.get('name') || 'MindMap Learner',
      email: form.get('email') || 'student@example.com',
      streak: user.streak,
    })
  }

  function addSubject(event) {
    event.preventDefault()
    if (!subjectForm.name.trim()) return
    const palette = ['#2dd4bf', '#f59e0b', '#60a5fa', '#f472b6', '#a3e635']
    const subject = {
      id: crypto.randomUUID(),
      ...subjectForm,
      color: palette[subjects.length % palette.length],
      topics: [],
    }
    setSubjects((current) => [...current, subject])
    setSelectedSubjectId(subject.id)
    setSubjectForm({ name: '', examDate: '2026-06-30', priority: 'Medium' })
  }

  function addTopic(event) {
    event.preventDefault()
    if (!topicForm.title.trim() || !selectedSubject) return
    setSubjects((current) =>
      current.map((subject) =>
        subject.id === selectedSubject.id
          ? {
              ...subject,
              topics: [
                ...subject.topics,
                {
                  id: crypto.randomUUID(),
                  ...topicForm,
                  estimatedHours: Number(topicForm.estimatedHours),
                  completed: false,
                },
              ],
            }
          : subject,
      ),
    )
    setTopicForm({ title: '', difficulty: 'Medium', estimatedHours: 2 })
  }

  function toggleTopic(subjectId, topicId) {
    setSubjects((current) =>
      current.map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              topics: subject.topics.map((topic) =>
                topic.id === topicId ? { ...topic, completed: !topic.completed } : topic,
              ),
            }
          : subject,
      ),
    )
  }

  function deleteSubject(subjectId) {
    setSubjects((current) => current.filter((subject) => subject.id !== subjectId))
    if (selectedSubjectId === subjectId && subjects.length > 1) {
      setSelectedSubjectId(subjects.find((subject) => subject.id !== subjectId).id)
    }
  }

  function addNote(event) {
    event.preventDefault()
    if (!noteForm.title.trim()) return
    setNotes((current) => [{ id: crypto.randomUUID(), ...noteForm }, ...current])
    setNoteForm({ title: '', subject: noteForm.subject })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MindMap AI</strong>
            <small>Study planner</small>
          </div>
        </div>
        <nav>
          {['dashboard', 'subjects', 'planner', 'analytics', 'notes'].map((view) => (
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
        <form className="auth-panel" onSubmit={handleLogin}>
          <span>Session</span>
          <input name="name" defaultValue={user.name} aria-label="Name" />
          <input name="email" defaultValue={user.email} aria-label="Email" />
          <button type="submit">Update profile</button>
        </form>
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
              <span>{user.streak}</span>
              <small>day streak</small>
            </div>
          </div>
        </header>

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
              <p>{stats.upcoming[0] ? `${daysLeft(stats.upcoming[0].examDate)} days left` : 'Add a subject first.'}</p>
            </div>
            <section className="wide-panel">
              <div className="section-head">
                <h2>Today</h2>
                <button type="button" onClick={() => setActiveView('planner')}>Open planner</button>
              </div>
              <div className="task-list">
                {(plan[0]?.sessions || []).map((session, index) => (
                  <article className="task-row" key={`${session.topic}-${index}`}>
                    <span className="task-icon">{session.type === 'Revision' ? 'R' : 'S'}</span>
                    <div>
                      <strong>{session.topic}</strong>
                      <small>{session.subject} - {session.hours}h - {session.difficulty}</small>
                    </div>
                  </article>
                ))}
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
                    <span>{subject.progress}% complete</span>
                    <small>{subject.hardPending} hard topics pending</small>
                  </article>
                ))}
              </div>
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
                    className={selectedSubject?.id === subject.id ? 'subject-card selected' : 'subject-card'}
                    key={subject.id}
                    onClick={() => setSelectedSubjectId(subject.id)}
                    type="button"
                  >
                    <span style={{ background: subject.color }} />
                    <strong>{subject.name}</strong>
                    <small>{daysLeft(subject.examDate)} days - {subject.priority}</small>
                    <em>{completion(subject)}%</em>
                  </button>
                ))}
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
                <form className="form-panel" onSubmit={addTopic}>
                  <div className="section-head">
                    <h2>Add topic</h2>
                    <button className="danger" type="button" onClick={() => deleteSubject(selectedSubject.id)}>Delete</button>
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
              )}
            </div>
            <div className="wide-panel full-span">
              <h2>{selectedSubject?.name || 'Topics'}</h2>
              <div className="topic-table">
                {(selectedSubject?.topics || []).map((topic) => (
                  <label key={topic.id} className={topic.completed ? 'topic-row done' : 'topic-row'}>
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={() => toggleTopic(selectedSubject.id, topic.id)}
                    />
                    <span>{topic.title}</span>
                    <small>{topic.difficulty}</small>
                    <em>{topic.estimatedHours}h</em>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === 'planner' && (
          <section className="planner-list">
            <div className="section-head">
              <h2>Generated study plan</h2>
              <span>{dailyHours} hours per day</span>
            </div>
            {plan.map((day) => (
              <article className="day-plan" key={day.label}>
                <div>
                  <strong>{day.label}</strong>
                  <small>{day.sessions.reduce((sum, session) => sum + session.hours, 0)} hours</small>
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
          </section>
        )}

        {activeView === 'analytics' && (
          <section className="analytics-grid">
            <div className="chart-panel">
              <h2>Subject completion</h2>
              {subjects.map((subject) => (
                <div className="bar-row" key={subject.id}>
                  <span>{subject.name}</span>
                  <div><i style={{ width: `${completion(subject)}%`, background: subject.color }} /></div>
                  <em>{completion(subject)}%</em>
                </div>
              ))}
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
                    <span>{daysLeft(subject.examDate)} days</span>
                    <small>{subject.priority} priority</small>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === 'notes' && (
          <section className="two-column">
            <form className="form-panel" onSubmit={addNote}>
              <h2>Add notes</h2>
              <input
                placeholder="File name or material title"
                value={noteForm.title}
                onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })}
              />
              <select
                value={noteForm.subject}
                onChange={(event) => setNoteForm({ ...noteForm, subject: event.target.value })}
              >
                {subjects.map((subject) => (
                  <option key={subject.id}>{subject.name}</option>
                ))}
              </select>
              <button type="submit">Save material</button>
            </form>
            <div className="wide-panel">
              <h2>Study materials</h2>
              <div className="task-list">
                {notes.map((note) => (
                  <article className="task-row" key={note.id}>
                    <span className="task-icon">N</span>
                    <div>
                      <strong>{note.title}</strong>
                      <small>{note.subject}</small>
                    </div>
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
