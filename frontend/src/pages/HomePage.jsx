import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzesPipeline } from '../services/api';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!url.trim()) { setError('Please paste a pipeline URL'); return; }
    if (!url.includes('dev.azure.com') && !url.includes('visualstudio.com')) {
      setError('URL must be an Azure DevOps pipeline URL');
      return;
    }
    setLoading(true);
    try {
      const result = await analyzesPipeline(url.trim(), pat.trim() || undefined);
      navigate(`/analysis/${result.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to start analysis');
      setLoading(false);
    }
  };

  const exampleUrl = 'https://dev.azure.com/{org}/{project}/_build/results?buildId=1234';

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroLabel}></div>
        <h1 className={styles.heroTitle}>
          Detect. Diagnose. <span className={styles.heroAccent}>Fix.</span>
        </h1>
        <p className={styles.heroSub}>
          Paste your Azure DevOps pipeline URL to instantly analyse all Playwright test failures and get actionable fix recommendations.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputBlock}>
          <label className={styles.label} htmlFor="pipeline-url">
            <span className={styles.labelIcon}>⬡</span>
            Pipeline URL
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>URL</span>
            <input
              id="pipeline-url"
              className={styles.input}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={exampleUrl}
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>
          <div className={styles.inputHint}>
            Supports <code>dev.azure.com</code> and <code>visualstudio.com</code> formats
          </div>
        </div>

        <div className={styles.inputBlock}>
          <label className={styles.label} htmlFor="pat">
            <span className={styles.labelIcon}>⬡</span>
            Personal Access Token
            <span className={styles.optional}>(optional — uses env var if omitted)</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>PAT</span>
            <input
              id="pat"
              className={styles.input}
              type={showPat ? 'text' : 'password'}
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••••••••••••"
              autoComplete="off"
              disabled={loading}
            />
            <button
              type="button"
              className={styles.togglePat}
              onClick={() => setShowPat((v) => !v)}
              tabIndex={-1}
            >
              {showPat ? 'hide' : 'show'}
            </button>
          </div>
          <div className={styles.inputHint}>
            Needs <strong>Test Management (Read)</strong> and <strong>Build (Read)</strong> scopes
          </div>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <span className={styles.errorIcon}>✕</span>
            {error}
          </div>
        )}

        <button className={styles.submitBtn} type="submit" disabled={loading || !url.trim()}>
          {loading ? (
            <>
              <span className={styles.spinner} />
              Analysing pipeline…
            </>
          ) : (
            <>
              <span className={styles.btnIcon}>▶</span>
              Analyse Failures
            </>
          )}
        </button>
      </form>

      <div className={styles.features}>
        {[
          { icon: '◈', title: 'Failure Detection', desc: 'Fetches all failed Playwright tests from Azure DevOps test runs including retry history.' },
          { icon: '◉', title: 'Root Cause Analysis', desc: 'Categorises failures: timeouts, selector issues, assertions, network errors, auth problems.' },
          { icon: '◎', title: 'Fix Recommendations', desc: 'Generates step-by-step solutions with code snippets tailored to the failure type.' },
          { icon: '◆', title: 'History & Trends', desc: 'Stores all analyses in PostgreSQL for tracking recurring failures across pipeline runs.' },
        ].map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <div className={styles.featureTitle}>{f.title}</div>
            <div className={styles.featureDesc}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
