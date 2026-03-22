let injected = false;

export function injectBaseStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #f7f7f5;
      --surface: #ffffff;
      --border: #e4e4e0;
      --accent: #3b5bdb;
      --accent-light: #eef1ff;
      --red: #e03131;
      --green: #2f9e44;
      --green-light: #ebfbee;
      --yellow: #f59f00;
      --text: #1a1a1a;
      --muted: #868686;
      --sans: 'DM Sans', sans-serif;
      --mono: 'DM Mono', monospace;
    }

    body {
      font-family: var(--sans);
      background: var(--bg);
      color: var(--text);
    }

    /* ── Nav ── */
    .t-nav {
      padding: 18px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .t-logo {
      font-family: var(--mono);
      font-size: 18px;
      font-weight: 500;
      text-decoration: none;
      color: var(--text);
    }
    .t-logo em { color: var(--accent); font-style: normal; }

    /* ── Buttons ── */
    .btn {
      font-family: var(--sans);
      font-size: 14px;
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:disabled { opacity: 0.4; cursor: default; pointer-events: none; }
    .btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
    .btn-outline:hover { background: var(--bg); }
    .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    .btn-primary:hover { background: #3451c7; border-color: #3451c7; }
    .btn-danger { background: var(--red); color: #fff; border-color: var(--red); }
    .btn-danger:hover { background: #c92a2a; }
    .btn-success { background: var(--green); color: #fff; border-color: var(--green); }
    .btn-success:hover { background: #276e39; }
    .btn-lg { font-size: 15px; padding: 11px 28px; border-radius: 10px; }
    .btn-sm { font-size: 12px; padding: 6px 12px; border-radius: 6px; }

    /* ── Card ── */
    .t-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 28px;
    }

    /* ── Badge ── */
    .badge {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 5px;
      display: inline-block;
    }
    .badge-blue  { background: var(--accent-light); color: var(--accent); }
    .badge-green { background: var(--green-light);  color: var(--green); }
    .badge-gray  { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }

    /* ── Input ── */
    .t-input {
      font-family: var(--sans);
      font-size: 14px;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--text);
      outline: none;
      width: 100%;
      transition: border-color 0.15s;
    }
    .t-input:focus { border-color: var(--accent); }
    .t-input::placeholder { color: #c0c0c0; }

    /* ── Label ── */
    .t-label {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 6px;
    }

    /* ── Player progress bar ── */
    .p-row { display: flex; align-items: center; gap: 12px; }
    .p-name { font-family: var(--mono); font-size: 12px; color: var(--muted); width: 64px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .p-track { flex: 1; height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; border: 1px solid var(--border); }
    .p-fill  { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
    .p-stat  { font-family: var(--mono); font-size: 11px; color: var(--muted); width: 44px; text-align: right; }

    /* ── Page wrapper ── */
    .t-page { min-height: 100vh; background: var(--bg); font-family: var(--sans); color: var(--text); }
    .t-main { max-width: 860px; margin: 0 auto; padding: 48px 40px 80px; }
    .t-main-sm { max-width: 520px; margin: 0 auto; padding: 48px 40px 80px; }
    .t-main-lg { max-width: 1040px; margin: 0 auto; padding: 48px 40px 80px; }

    /* ── Section header ── */
    .t-section-title { font-size: 20px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 4px; }
    .t-section-sub   { font-size: 14px; color: var(--muted); }

    /* ── Divider ── */
    .t-divider { border: none; border-top: 1px solid var(--border); margin: 24px 0; }

    /* ── Overlay / Modal ── */
    .t-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      z-index: 200;
    }
    .t-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      width: 360px;
      position: relative;
    }
    .t-modal h2 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
    .t-modal p  { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
    .t-modal-close {
      position: absolute; top: 14px; right: 16px;
      background: none; border: none; cursor: pointer;
      font-size: 18px; color: var(--muted); line-height: 1;
    }
    .t-modal-close:hover { color: var(--text); }

    /* ── Countdown overlay ── */
    .countdown-overlay {
      position: fixed; inset: 0;
      background: rgba(247,247,245,0.92);
      display: flex; align-items: center; justify-content: center;
      z-index: 300;
      flex-direction: column;
      gap: 12px;
    }
    .countdown-number {
      font-family: var(--mono);
      font-size: 96px;
      font-weight: 500;
      color: var(--accent);
      animation: pop 0.3s ease;
      line-height: 1;
    }
    .countdown-label { font-size: 14px; color: var(--muted); }
    @keyframes pop { from { transform: scale(1.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    @media (max-width: 640px) {
      .t-nav  { padding: 14px 20px; }
      .t-main { padding: 32px 20px 60px; }
      .t-main-sm { padding: 32px 20px 60px; }
      .t-main-lg { padding: 32px 20px 60px; }
    }
  `;
  document.head.appendChild(style);
}

export const PLAYER_COLORS = [
  '#3b5bdb',
  '#2f9e44',
  '#e03131',
  '#f59f00',
  '#7c3aed',
  '#0891b2',
];
