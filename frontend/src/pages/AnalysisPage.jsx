import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAnalysis, deleteAnalysis } from '../services/api';
import FailureCard from '../components/FailureCard';
import StatsBar from '../components/StatsBar';
import styles from './AnalysisPage.module.css';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getAnalysis(id);
      setAnalysis(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analysis');
    }
  }, [id]);

  // Poll while processing
  useEffect(() => {
    let timer;
    const poll = async () => {
      const data = await fetchData();
      if (data && (data.status === 'processing' || data.status === 'processing_results')) {
        timer = setTimeout(poll, 2500);
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this analysis? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteAnalysis(id);
      navigate('/history');
    } catch {
      setDeleting(false);
    }
  };

  if (error) return (
    <div className={styles.centered}>
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>✕</div>
        <div className={styles.errorText}>{error}</div>
        <Link to="/" className={styles.backBtn}>← Back to Analyzer</Link>
      </div>
    </div>
  );

  if (!analysis) return (
    <div className={styles.centered}>
      <div className={styles.loadingState}>
        <div className={styles.loadSpinner} />
        <div className={styles.loadText}>Loading analysis…</div>
      </div>
    </div>
  );

  const isProcessing = analysis.status === 'processing' || analysis.status === 'processing_results';
  const failures = analysis.failures || [];

  // Filter & sort
  const filtered = failures
    .filter(f => {
      if (filter !== 'all' && f.error_type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.test_name?.toLowerCase().includes(q) ||
          f.test_suite?.toLowerCase().includes(q) ||
          f.error_message?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return (PRIORITY_ORDER[a.solution_priority] ?? 9) - (PRIORITY_ORDER[b.solution_priority] ?? 9);
      }
      if (sortBy === 'name') return (a.test_name || '').localeCompare(b.test_name || '');
      if (sortBy === 'duration') return (b.duration_ms || 0) - (a.duration_ms || 0);
      return 0;
    });

  const errorTypes = [...new Set(failures.map(f => f.error_type).filter(Boolean))];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backLink}>← Analyzer</Link>
          <div className={styles.runName}>{analysis.run_name || `Analysis #${id.slice(0, 8)}`}</div>
          <div className={styles.runMeta}>
            {analysis.organization && <span>{analysis.organization}</span>}
            {analysis.project && <><span className={styles.sep}>/</span><span>{analysis.project}</span></>}
            {analysis.pipeline_id && <><span className={styles.sep}>build</span><span>#{analysis.pipeline_id}</span></>}
          </div>
        </div>
        <div className={styles.headerRight}>
          <StatusBadge status={analysis.status} />
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={deleting || isProcessing}
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar analysis={analysis} />

      {/* Processing indicator */}
      {isProcessing && (
        <div className={styles.processingBanner}>
          <span className={styles.processingSpinner} />
          <span>Fetching test results from Azure DevOps… This may take a moment.</span>
        </div>
      )}

      {/* Failed status */}
      {analysis.status === 'failed' && (
        <div className={styles.failedBanner}>
          <span className={styles.failedIcon}>✕</span>
          <span>Analysis failed: {analysis.run_name}</span>
        </div>
      )}

      {/* Failures section */}
      {failures.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>◈</span>
              Test Failures
              <span className={styles.sectionCount}>{failures.length}</span>
            </div>
            <div className={styles.controls}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search tests…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className={styles.select}
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="all">All types</option>
                {errorTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                className={styles.select}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="priority">Sort: Priority</option>
                <option value="name">Sort: Name</option>
                <option value="duration">Sort: Duration</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>No failures match your filter.</div>
          ) : (
            <div className={styles.failureList}>
              {filtered.map((failure, idx) => (
                <FailureCard
                  key={failure.id}
                  failure={failure}
                  index={idx}
                  expanded={expandedId === failure.id}
                  onToggle={() => setExpandedId(expandedId === failure.id ? null : failure.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {analysis.status === 'completed' && failures.length === 0 && (
        <div className={styles.allPassedBanner}>
          <span className={styles.passedIcon}>✓</span>
          <span>No failures found — all tests passed!</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    processing: { label: 'Processing', color: 'yellow' },
    processing_results: { label: 'Analysing', color: 'yellow' },
    completed: { label: 'Completed', color: 'green' },
    failed: { label: 'Failed', color: 'red' },
    pending: { label: 'Pending', color: 'dim' },
  };
  const s = map[status] || map.pending;
  return <span className={`${styles.badge} ${styles[`badge_${s.color}`]}`}>{s.label}</span>;
}
