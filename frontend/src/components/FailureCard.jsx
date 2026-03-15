import styles from './FailureCard.module.css';

const PRIORITY_COLORS = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'green',
};

const ERROR_TYPE_LABELS = {
  timeout: 'Timeout',
  element_not_found: 'Element Not Found',
  assertion: 'Assertion',
  network: 'Network',
  navigation: 'Navigation',
  selector: 'Selector',
  authentication: 'Auth',
  runtime: 'Runtime',
  unknown: 'Unknown',
};

const fmt = (ms) => {
  if (!ms) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export default function FailureCard({ failure, index, expanded, onToggle }) {
  const priority = failure.solution_priority || 'medium';
  const pColor = PRIORITY_COLORS[priority] || 'yellow';
  const solutionSteps = (() => {
    try {
      return typeof failure.solution_steps === 'string'
        ? JSON.parse(failure.solution_steps)
        : failure.solution_steps || [];
    } catch { return []; }
  })();

  const confidence = failure.confidence_score
    ? Math.round(parseFloat(failure.confidence_score) * 100)
    : null;

  return (
    <div
      className={`${styles.card} ${expanded ? styles.expanded : ''} ${styles[`priority_${pColor}`]}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Card header - always visible */}
      <button className={styles.cardHeader} onClick={onToggle} aria-expanded={expanded}>
        <div className={styles.headerLeft}>
          <span className={`${styles.priorityDot} ${styles[`dot_${pColor}`]}`} title={`Priority: ${priority}`} />
          <div className={styles.testInfo}>
            <div className={styles.testName}>{failure.test_name}</div>
            <div className={styles.testMeta}>
              {failure.test_suite && <span className={styles.metaTag}>{failure.test_suite}</span>}
              {failure.browser && failure.browser !== 'unknown' && (
                <span className={styles.metaTag}>{failure.browser}</span>
              )}
              {failure.error_type && (
                <span className={`${styles.errorTypePill} ${styles[`errorType_${failure.error_type}`]}`}>
                  {ERROR_TYPE_LABELS[failure.error_type] || failure.error_type}
                </span>
              )}
              {fmt(failure.duration_ms) && (
                <span className={styles.duration}>{fmt(failure.duration_ms)}</span>
              )}
              {failure.retry_count > 0 && (
                <span className={styles.retryBadge}>↺ {failure.retry_count} retries</span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {failure.solution_category && (
            <span className={styles.categoryPill}>{failure.solution_category}</span>
          )}
          {confidence !== null && (
            <span className={styles.confidence} title="Fix confidence score">
              {confidence}% conf.
            </span>
          )}
          <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className={styles.body}>
          {/* Error message */}
          {failure.error_message && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Error Message</div>
              <pre className={styles.errorMsg}>{failure.error_message}</pre>
            </div>
          )}

          {/* Stack trace (collapsed) */}
          {failure.stack_trace && (
            <details className={styles.stackDetails}>
              <summary className={styles.stackSummary}>Stack Trace</summary>
              <pre className={styles.stackTrace}>{failure.stack_trace}</pre>
            </details>
          )}

          {/* Divider */}
          <div className={styles.divider} />

          {/* Root cause */}
          {failure.root_cause && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionIcon}>◉</span> Root Cause Analysis
              </div>
              <p className={styles.rootCause}>{failure.root_cause}</p>
            </div>
          )}

          {/* Solution steps */}
          {solutionSteps.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionIcon}>◈</span> Fix Recommendations
              </div>
              <div className={styles.steps}>
                {solutionSteps.map((step, i) => (
                  <div key={i} className={styles.step}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepNum}>0{step.step || i + 1}</span>
                      <span className={styles.stepTitle}>{step.title}</span>
                    </div>
                    {step.description && (
                      <p className={styles.stepDesc}>{step.description}</p>
                    )}
                    {step.code && (
                      <div className={styles.codeBlock}>
                        <div className={styles.codeLang}>playwright · typescript</div>
                        <pre className={styles.code}>{step.code}</pre>
                        <button
                          className={styles.copyBtn}
                          onClick={() => navigator.clipboard?.writeText(step.code)}
                          title="Copy code"
                        >
                          copy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {(failure.screenshot_url || failure.video_url) && (
            <div className={styles.attachments}>
              {failure.screenshot_url && (
                <a href={failure.screenshot_url} target="_blank" rel="noopener noreferrer" className={styles.attachLink}>
                  ◩ Screenshot
                </a>
              )}
              {failure.video_url && (
                <a href={failure.video_url} target="_blank" rel="noopener noreferrer" className={styles.attachLink}>
                  ▶ Video Recording
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
