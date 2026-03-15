import styles from './StatsBar.module.css';

const fmt = (ms) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;

export default function StatsBar({ analysis }) {
  const total = analysis.total_tests || 0;
  const failed = analysis.failed_tests || 0;
  const passed = analysis.passed_tests || 0;
  const skipped = analysis.skipped_tests || 0;
  const passRate = pct(passed, total);
  const failRate = pct(failed, total);

  return (
    <div className={styles.stats}>
      <Stat label="Total Tests" value={total || '—'} color="cyan" />
      <Stat label="Failed" value={failed || '—'} color={failed > 0 ? 'red' : 'green'} />
      <Stat label="Passed" value={passed || '—'} color="green" />
      <Stat label="Skipped" value={skipped || '—'} color="dim" />
      <Stat label="Pass Rate" value={total ? `${passRate}%` : '—'} color={passRate > 90 ? 'green' : passRate > 70 ? 'yellow' : 'red'} />
      <Stat label="Duration" value={fmt(analysis.duration_ms)} color="cyan" />

      {total > 0 && (
        <div className={styles.progressBar}>
          <div className={styles.progressLabel}>Test Distribution</div>
          <div className={styles.bar}>
            <div className={styles.barPass} style={{ width: `${passRate}%` }} title={`Passed ${passed}`} />
            <div className={styles.barFail} style={{ width: `${failRate}%` }} title={`Failed ${failed}`} />
            <div className={styles.barSkip} style={{ width: `${pct(skipped, total)}%` }} title={`Skipped ${skipped}`} />
          </div>
          <div className={styles.legend}>
            <span className={styles.legendPass}>■ Passed {passed}</span>
            <span className={styles.legendFail}>■ Failed {failed}</span>
            {skipped > 0 && <span className={styles.legendSkip}>■ Skipped {skipped}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className={styles.stat}>
      <div className={`${styles.statValue} ${styles[`color_${color}`]}`}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
