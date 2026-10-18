import { useEffect, useState } from 'react';
import site from './site.json';
import { BUILD_NUMBER, GIT_COMMIT } from './buildInfo';
import Wall from './Wall.jsx';
import Studio from './Studio.jsx';

function currentPage() {
  return window.location.hash === '#/studio' ? 'studio' : 'wall';
}

export default function App() {
  const [page, setPage] = useState(currentPage);

  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme', site.themeColor);
    document.title = site.headline;
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="brand-mark" aria-hidden="true">✿</span> {site.headline}
        </a>
        <nav>
          <a href="#/" className={page === 'wall' ? 'active' : ''}>Wall</a>
          <a href="#/studio" className={page === 'studio' ? 'active' : ''}>Release Studio</a>
        </nav>
      </header>

      <main>{page === 'studio' ? <Studio deployed={site} /> : <Wall site={site} />}</main>

      <footer className="footer">
        <span>{site.versionLabel}</span>
        <span className="dot">•</span>
        <span className="build" data-testid="build">Build #{BUILD_NUMBER}</span>
        <span className="dot">•</span>
        <code>{GIT_COMMIT}</code>
      </footer>
    </div>
  );
}
