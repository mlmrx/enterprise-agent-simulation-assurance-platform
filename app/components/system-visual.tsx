export function SystemVisual() {
  return (
    <div className="system-visual" aria-label="Animated assurance system diagram">
      <div className="visual-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="agent-core">
        <span>AGENT</span>
        <strong>Candidate<br />v2.4.1</strong>
        <i />
      </div>
      <div className="signal-node node-world"><span>01</span><strong>World</strong><small>state pinned</small></div>
      <div className="signal-node node-fault"><span>02</span><strong>Adversary</strong><small>fault injected</small></div>
      <div className="signal-node node-policy"><span>03</span><strong>Policy</strong><small>boundary active</small></div>
      <div className="signal-node node-evidence"><span>04</span><strong>Evidence</strong><small>trace sealed</small></div>
      <div className="moving-packet packet-a" />
      <div className="moving-packet packet-b" />
      <div className="visual-readout">
        <span><i className="green" /> deterministic replay</span>
        <code>trace_7f2a91cd</code>
      </div>
    </div>
  );
}
