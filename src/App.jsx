import { useState, useEffect, useCallback } from 'react';
import './App.css';

// Automatically detect API base URL (Vite proxy /api or direct localhost:3001)
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Health state
  const [health, setHealth] = useState(null);
  const [healthStatus, setHealthStatus] = useState('loading'); // 'online' | 'offline' | 'loading'
  const [latency, setLatency] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Filter & Search
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [category, setCategory] = useState('Frontend');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  // Health Check Function
  const checkBackendHealth = useCallback(async () => {
    setCheckingHealth(true);
    const start = performance.now();
    try {
      // First attempt relative URL (Vite proxy), fallback to absolute if needed
      let res;
      try {
        res = await fetch(`${API_BASE}/api/health`);
      } catch {
        res = await fetch('http://localhost:3001/api/health');
      }

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      setHealth(data);
      setLatency(elapsed);
      setHealthStatus('online');
      setError(null);
    } catch (err) {
      setHealthStatus('offline');
      setLatency(null);
      console.warn('Backend currently unreachable:', err.message);
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  // Fetch Tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/tasks`);
      } catch {
        res = await fetch('http://localhost:3001/api/tasks');
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Could not connect to Next.js API. Make sure the backend server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkBackendHealth();
    fetchTasks();

    // Auto-ping every 25 seconds
    const interval = setInterval(checkBackendHealth, 25000);
    return () => clearInterval(interval);
  }, [checkBackendHealth, fetchTasks]);

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || submitting) return;

    setSubmitting(true);
    try {
      let res;
      const payload = {
        title: newTaskTitle.trim(),
        category,
        priority,
      };

      try {
        res = await fetch(`${API_BASE}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch('http://localhost:3001/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success && result.data) {
        setTasks((prev) => [result.data, ...prev]);
        setNewTaskTitle('');
      } else {
        alert(result.error || 'Failed to create task');
      }
    } catch (err) {
      alert(`Error creating task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Task Status
  const handleToggleTask = async (task) => {
    const updatedCompleted = !task.completed;
    
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: updatedCompleted } : t))
    );

    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: updatedCompleted }),
        });
      } catch {
        res = await fetch(`http://localhost:3001/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: updatedCompleted }),
        });
      }

      if (!res.ok) {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    // Optimistic UI update
    const previous = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/tasks/${id}`, {
          method: 'DELETE',
        });
      } catch {
        res = await fetch(`http://localhost:3001/api/tasks/${id}`, {
          method: 'DELETE',
        });
      }

      if (!res.ok) {
        setTasks(previous);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setTasks(previous);
    }
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'active'
        ? !t.completed
        : t.completed;

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="logo-badge">⚡</div>
          <div className="brand-info">
            <h1>TaskPulse Hub</h1>
            <p>React (Vite) Frontend + Next.js (App Router) Backend</p>
          </div>
        </div>

        <div className="stack-pills">
          <span className="pill pill-react">⚛️ Vite :5173</span>
          <span className="pill pill-next">▲ Next.js API :3001</span>
        </div>
      </header>

      {/* Backend Health Status Banner */}
      <section className="health-banner">
        <div className="health-info">
          <div className={`status-indicator ${healthStatus}`} />
          <div>
            <div className="health-title">
              {healthStatus === 'online'
                ? 'Next.js Backend API Connected'
                : healthStatus === 'loading'
                ? 'Connecting to Backend...'
                : 'Next.js Backend API Offline'}
            </div>
            <div className="health-desc">
              {healthStatus === 'online'
                ? `${health?.service || 'API Server'} • Node ${health?.environment} • Uptime: ${health?.uptimeSeconds ?? 0}s`
                : 'Start the Next.js server on port 3001 to enable live API synchronization'}
            </div>
          </div>
        </div>

        <div className="health-stats">
          {latency !== null && (
            <div className="health-stat-item">
              <div className="health-stat-label">Latency</div>
              <div className="health-stat-val">{latency} ms</div>
            </div>
          )}
          <button
            className="btn-ping"
            onClick={() => {
              checkBackendHealth();
              fetchTasks();
            }}
            disabled={checkingHealth}
          >
            <span>{checkingHealth ? '⏳' : '🔄'}</span>
            <span>{checkingHealth ? 'Testing...' : 'Ping API'}</span>
          </button>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Pipeline Tasks</div>
          <div className="metric-number">{totalTasks}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active / In Progress</div>
          <div className="metric-number" style={{ color: '#fbbf24' }}>{activeTasks}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Completed</div>
          <div className="metric-number" style={{ color: '#34d399' }}>{completedTasks}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Completion Rate</div>
          <div className="metric-number" style={{ color: '#a78bfa' }}>{completionRate}%</div>
        </div>
      </section>

      {/* Main Grid: Create Task + Task List */}
      <div className="dashboard-grid">
        {/* Left Column: Form */}
        <div className="create-card">
          <h2 className="card-title">
            <span>✨</span> Create New Task
          </h2>
          <form onSubmit={handleCreateTask}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-title-input">Task Description</label>
              <input
                id="task-title-input"
                className="form-input"
                type="text"
                placeholder="e.g. Configure Jenkins webhook triggers"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div className="category-tags">
                {['Frontend', 'Backend', 'CI/CD', 'Database', 'DevOps'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-btn ${category === cat ? 'selected' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <div className="priority-options">
                {['low', 'medium', 'high'].map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    className={`prio-btn ${prio} ${priority === prio ? `selected ${prio}` : ''}`}
                    onClick={() => setPriority(prio)}
                  >
                    {prio.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !newTaskTitle.trim()}
            >
              {submitting ? 'Creating...' : '+ Add Task via API'}
            </button>
          </form>
        </div>

        {/* Right Column: Task List & Controls */}
        <div className="tasks-column">
          <div className="filters-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search tasks or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="status-tabs">
              <button
                className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({totalTasks})
              </button>
              <button
                className={`tab-btn ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                Active ({activeTasks})
              </button>
              <button
                className={`tab-btn ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => setFilter('completed')}
              >
                Done ({completedTasks})
              </button>
            </div>
          </div>

          {/* Task List items */}
          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <p>Fetching tasks from Next.js backend...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No tasks match the selected criteria.</p>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-card ${task.completed ? 'completed' : ''}`}
                >
                  <button
                    className={`task-toggle ${task.completed ? 'checked' : ''}`}
                    onClick={() => handleToggleTask(task)}
                    title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    aria-label="Toggle task completion status"
                  >
                    {task.completed && '✓'}
                  </button>

                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="badge-cat">{task.category}</span>
                      <span className={`badge-prio ${task.priority}`}>
                        {task.priority}
                      </span>
                      <span className="task-time">
                        {new Date(task.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          Connected via <strong>Next.js REST API</strong> routes with full CORS & Vite Proxy integration.
        </div>
        <div className="endpoint-tags">
          <span className="endpoint-tag">GET /api/health</span>
          <span className="endpoint-tag">GET /api/tasks</span>
          <span className="endpoint-tag">POST /api/tasks</span>
          <span className="endpoint-tag">PATCH /api/tasks/:id</span>
        </div>
      </footer>
    </div>
  );
}
