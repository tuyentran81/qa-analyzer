import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAnalyses, deleteAnalysis } from '../services/api';
import styles from './HistoryPage.module.css';

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_COLOR = {
  completed: 'green',
  failed: 'red',
  processing: 'yellow',
  processing_results: 'yellow',
  pending: 'dim',
};

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAnalyses(50);
      setAnalyses(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this analysis?')) return;
    setDeletingId(id);
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analysis History</h1>
          <p className={styles.subtitle}>All past pipeline analyses stored in your database</p>
        </div>
        <Link to="/" className={styles.newBtn}>+ New Analysis</Link>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading history…</span>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {!loading && analyses.length === 0 && !error && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◌</div>
          <div className={styles.emptyTitle}>No analyses yet</div>
          <p className={styles.emptyDesc}>Paste a pipeline URL on the Analyze page to get started.</p>
          <Link to="/" className={styles.emptyLink}>Go to Analyzer →</Link>
        </div>
      )}

      {analyses.length > 0 && (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <div>Pipeline / Run</div>
            <div>Project</div>
            <div>Tests</div>
            <div>Failures</div>
            <div>Status</div>
            <div>Date</div>
            <div />
          </div>
          {analyses.map((a, idx) => (
            <Link
              key={a.id}
              to={`/analysis/${a.id}`}
              className={styles.tableRow}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className={styles.runName} title={a.pipeline_url}>
                {a.run_name || `Build #${a.pipeline_id}`}
              </div>
              <div className={styles.project}>
                <span>{a.organization}</span>
                {a.project && <><span className={styles.slash}>/</span><span>{a.project}</span></>}
              </div>
              <div className={styles.total}>{a.total_tests ?? '—'}</div>
              <div className={styles.failures}>
                {a.failed_tests > 0 ? (
                  <span className={styles.failCount}>{a.failed_tests} ✕</span>
                ) : (
                  <span className={styles.passCount}>{a.failed_tests === 0 ? '0 ✓' : '—'}</span>
                )}
              </div>
              <div>
                <span className={`${styles.badge} ${styles[`badge_${STATUS_COLOR[a.status] || 'dim'}`]}`}>
                  {a.status}
                </span>
              </div>
              <div className={styles.date}>{fmt(a.created_at)}</div>
              <div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(e, a.id)}
                  disabled={deletingId === a.id}
                  title="Delete"
                >
                  {deletingId === a.id ? '…' : '✕'}
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
