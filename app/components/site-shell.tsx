import Link from "next/link";
import Image from "next/image";

const github = "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="EASAP home">
        <Image className="site-mark" src="/brand/easap-mark.svg" width={42} height={42} alt="" unoptimized />
        <span><strong>EASAP</strong><small>Enterprise agent assurance</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/what-is-easap">Why EASAP</Link>
        <Link href="/platform">Platform</Link>
        <Link href="/developers">Developers</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/news">Intelligence</Link>
      </nav>
      <div className="header-actions">
        <span className="assurance-status"><i /> Open reference</span>
        <a className="github-link" href={github} target="_blank" rel="noreferrer">GitHub <span>↗</span></a>
        <Link className="button button-dark" href="/assess">Assess an agent</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="site-brand footer-brand" href="/">
          <Image className="site-mark" src="/brand/easap-mark.svg" width={42} height={42} alt="" unoptimized />
          <span><strong>EASAP</strong><small>Evidence before authority.</small></span>
        </Link>
        <p>Open, portable infrastructure for deciding when a consequential enterprise agent has earned a defined operating authority.</p>
      </div>
      <div className="footer-links">
        <span>Product</span>
        <Link href="/what-is-easap">What is EASAP?</Link>
        <Link href="/connect">Public agent connector</Link>
        <Link href="/guides">Function guides</Link>
        <Link href="/assess">Readiness planner</Link>
        <Link href="/platform">Live workbench</Link>
        <Link href="/developers">Developer tools</Link>
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
