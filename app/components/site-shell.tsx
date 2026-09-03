import Link from "next/link";

const github = "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="EASAP home">
        <span className="site-mark"><i /><i /><i /></span>
        <span><strong>EASAP</strong><small>Agent assurance infrastructure</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#system">System</Link>
        <Link href="/platform">Live platform</Link>
        <Link href="/insights">Insights</Link>
        <Link href="/news">Intelligence</Link>
      </nav>
      <div className="header-actions">
        <a className="github-link" href={github} target="_blank" rel="noreferrer">GitHub <span>↗</span></a>
        <Link className="button button-dark" href="/platform">Open live demo</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="site-brand footer-brand" href="/">
          <span className="site-mark"><i /><i /><i /></span>
          <span><strong>EASAP</strong><small>Evidence before authority.</small></span>
        </Link>
        <p>Open, portable infrastructure for testing consequential enterprise agents against realistic worlds, hostile conditions, and explicit release gates.</p>
      </div>
      <div className="footer-links">
        <span>Product</span>
        <Link href="/platform">Live workbench</Link>
        <Link href="/insights">Insights</Link>
        <Link href="/news">Daily intelligence</Link>
      </div>
      <div className="footer-links">
        <span>Build in the open</span>
        <a href={github} target="_blank" rel="noreferrer">Source code ↗</a>
        <a href={`${github}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer">Architecture ↗</a>
        <a href={`${github}/blob/main/openapi/easap.v1.yaml`} target="_blank" rel="noreferrer">OpenAPI ↗</a>
      </div>
      <div className="footer-bottom"><span>Apache-2.0</span><span>STANDARD reference implementation · EASAP-PS-001</span><span>© 2026 EASAP</span></div>
    </footer>
  );
}
