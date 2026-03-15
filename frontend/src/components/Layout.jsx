import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand}>
            <span className={styles.brandIcon}>⬡</span>
            <span className={styles.brandText}>QA<span className={styles.brandAccent}>Analyzer</span></span>
          </NavLink>
          <nav className={styles.nav}>
            <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
              Analyze
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
              History
            </NavLink>
          </nav>
          <div className={styles.headerBadge}>
            <span className={styles.dot} />
            Playwright · Azure DevOps
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <span>QA Analyzer v1.0 — Playwright Failure Analyzer for Azure DevOps &nbsp;|&nbsp; @Copyright - 2026</span>
      </footer>
    </div>
  );
}
