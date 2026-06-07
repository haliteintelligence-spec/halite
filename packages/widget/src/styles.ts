export function getStyles(accent: string): string {
  return `
    .hlw-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .hlw-modal {
      background: #fff; border-radius: 20px;
      width: min(520px, calc(100vw - 32px));
      max-height: calc(100vh - 64px);
      overflow: hidden; display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.18);
      animation: hlw-slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes hlw-slide-up {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .hlw-header {
      padding: 20px 24px 0;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .hlw-logo {
      font-size: 11px; font-weight: 700; letter-spacing: 0.15em;
      text-transform: uppercase; color: #999;
    }
    .hlw-close {
      width: 28px; height: 28px; border-radius: 50%;
      background: #f5f5f5; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #666; font-size: 14px; transition: background 0.15s;
    }
    .hlw-close:hover { background: #ebebeb; }
    .hlw-progress-track {
      height: 3px; background: #f0f0f0; margin: 16px 24px 0; border-radius: 2px; flex-shrink: 0;
    }
    .hlw-progress-fill {
      height: 100%; border-radius: 2px;
      background: ${accent}; transition: width 0.4s ease;
    }
    .hlw-body {
      padding: 24px; overflow-y: auto; flex: 1;
    }
    .hlw-question-text {
      font-size: 17px; font-weight: 600; color: #1a1a1a;
      line-height: 1.4; margin: 0 0 6px;
    }
    .hlw-question-sub {
      font-size: 13px; color: #888; margin: 0 0 20px;
    }
    .hlw-options { display: flex; flex-direction: column; gap: 8px; }
    .hlw-option {
      padding: 12px 16px; border-radius: 12px;
      border: 1.5px solid #e8e8e8; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      background: #fff;
    }
    .hlw-option:hover { border-color: ${accent}; background: ${accent}14; }
    .hlw-option.selected { border-color: ${accent}; background: ${accent}14; }
    .hlw-option-label {
      font-size: 14px; font-weight: 500; color: #1a1a1a;
    }
    .hlw-option-desc {
      font-size: 12px; color: #888; margin-top: 2px;
    }
    .hlw-scale-wrap { padding: 8px 0; }
    .hlw-scale-input {
      width: 100%; margin: 12px 0 8px;
      accent-color: ${accent};
    }
    .hlw-scale-labels {
      display: flex; justify-content: space-between;
      font-size: 11px; color: #888;
    }
    .hlw-text-input {
      width: 100%; padding: 12px 14px; border-radius: 12px;
      border: 1.5px solid #e8e8e8; font-size: 14px;
      outline: none; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .hlw-text-input:focus { border-color: ${accent}; }
    .hlw-footer {
      padding: 16px 24px 20px;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      border-top: 1px solid #f0f0f0;
    }
    .hlw-btn-back {
      padding: 10px 18px; border-radius: 10px;
      background: #f5f5f5; border: none; cursor: pointer;
      font-size: 13px; font-weight: 500; color: #555;
      transition: background 0.15s;
    }
    .hlw-btn-back:hover { background: #ebebeb; }
    .hlw-btn-next {
      flex: 1; padding: 12px 18px; border-radius: 10px;
      background: ${accent}; border: none; cursor: pointer;
      font-size: 14px; font-weight: 600; color: #fff;
      transition: opacity 0.15s;
    }
    .hlw-btn-next:hover { opacity: 0.9; }
    .hlw-btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
    .hlw-loading {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 48px 24px; gap: 16px;
    }
    .hlw-spinner {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid #f0f0f0;
      border-top-color: ${accent};
      animation: hlw-spin 0.8s linear infinite;
    }
    @keyframes hlw-spin { to { transform: rotate(360deg); } }
    .hlw-loading-text {
      font-size: 15px; font-weight: 500; color: #1a1a1a; text-align: center;
    }
    .hlw-loading-sub {
      font-size: 13px; color: #888; text-align: center;
    }
    .hlw-dots span {
      display: inline-block; width: 5px; height: 5px; border-radius: 50%;
      background: ${accent}; margin: 0 2px;
      animation: hlw-dot 1.2s infinite ease-in-out;
    }
    .hlw-dots span:nth-child(2) { animation-delay: 0.2s; }
    .hlw-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes hlw-dot {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
    .hlw-routine { display: flex; flex-direction: column; gap: 24px; }
    .hlw-routine-header { margin-bottom: 4px; }
    .hlw-routine-title {
      font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px;
    }
    .hlw-routine-sub {
      font-size: 13px; color: #888; margin: 0;
    }
    .hlw-time-group { display: flex; flex-direction: column; gap: 8px; }
    .hlw-time-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: #aaa; margin-bottom: 4px;
    }
    .hlw-step-card {
      padding: 14px 16px; border-radius: 14px;
      border: 1.5px solid #f0f0f0; background: #fafafa;
    }
    .hlw-step-top {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .hlw-step-num {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      background: ${accent}20; color: ${accent};
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .hlw-step-name {
      font-size: 14px; font-weight: 600; color: #1a1a1a; flex: 1;
    }
    .hlw-step-price {
      font-size: 12px; font-weight: 500; color: #888;
    }
    .hlw-step-instruction {
      font-size: 12px; color: #666; line-height: 1.5; margin-bottom: 8px;
    }
    .hlw-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .hlw-tag {
      font-size: 10px; padding: 3px 8px; border-radius: 100px;
      background: ${accent}15; color: ${accent};
      font-weight: 500;
    }
    .hlw-add-to-cart {
      display: inline-flex; align-items: center;
      margin-top: 10px;
      padding: 7px 14px; border-radius: 100px;
      font-size: 12px; font-weight: 600;
      text-decoration: none;
      background: ${accent}; color: #fff;
      transition: opacity 0.15s;
    }
    .hlw-add-to-cart:hover { opacity: 0.8; }
    .hlw-error {
      padding: 32px 24px; text-align: center;
    }
    .hlw-error-icon { font-size: 32px; margin-bottom: 12px; }
    .hlw-error-text { font-size: 15px; color: #1a1a1a; font-weight: 500; margin-bottom: 6px; }
    .hlw-error-sub { font-size: 13px; color: #888; }

    /* ── Prefill badge ── */
    .hlw-prefill-badge {
      font-size: 11px; font-weight: 500; color: ${accent};
      background: ${accent}12; border: 1px solid ${accent}30;
      border-radius: 8px; padding: 7px 12px; margin-bottom: 16px;
    }

    /* ── Area tabs (multi-area routines) ── */
    .hlw-area-tabs {
      display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px;
    }
    .hlw-area-tab {
      padding: 7px 16px; border-radius: 100px;
      border: 1.5px solid #e8e8e8; background: #fff;
      font-size: 12px; font-weight: 600; color: #888; cursor: pointer;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }
    .hlw-area-tab:hover { border-color: ${accent}; color: ${accent}; }
    .hlw-area-tab.active { border-color: ${accent}; background: ${accent}; color: #fff; }
    .hlw-area-panel { display: flex; flex-direction: column; gap: 20px; }

    /* ── Check-in styles ── */
    .hlw-rating-row {
      display: flex; gap: 8px; margin-bottom: 24px;
    }
    .hlw-rating-btn {
      flex: 1; padding: 14px 0; border-radius: 12px;
      border: 1.5px solid #e8e8e8; background: #fff;
      cursor: pointer; font-size: 18px; transition: border-color 0.15s, background 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .hlw-rating-btn span { font-size: 10px; color: #aaa; font-weight: 500; }
    .hlw-rating-btn:hover { border-color: ${accent}; background: ${accent}10; }
    .hlw-rating-btn.selected { border-color: ${accent}; background: ${accent}18; }
    .hlw-rating-btn.selected span { color: ${accent}; }
    .hlw-symptom-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px;
    }
    .hlw-symptom-btn {
      padding: 10px 12px; border-radius: 10px;
      border: 1.5px solid #e8e8e8; background: #fff; cursor: pointer;
      font-size: 12px; font-weight: 500; color: #555; text-align: left;
      transition: border-color 0.15s, background 0.15s;
    }
    .hlw-symptom-btn:hover { border-color: ${accent}; }
    .hlw-symptom-btn.selected { border-color: ${accent}; background: ${accent}14; color: ${accent}; }
    .hlw-symptom-btn.positive { border-color: #e8e8e8; }
    .hlw-symptom-btn.positive.selected { border-color: #4caf82; background: #4caf8214; color: #4caf82; }
    .hlw-section-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: #aaa; margin-bottom: 10px;
    }
    .hlw-product-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .hlw-product-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 12px;
      border: 1.5px solid #f0f0f0; background: #fafafa;
    }
    .hlw-product-name { flex: 1; font-size: 13px; color: #333; font-weight: 500; }
    .hlw-reaction-btns { display: flex; gap: 4px; }
    .hlw-reaction-btn {
      width: 28px; height: 28px; border-radius: 8px;
      border: 1.5px solid #e8e8e8; background: #fff;
      cursor: pointer; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: border-color 0.15s, background 0.15s;
    }
    .hlw-reaction-btn.active-pos { border-color: #4caf82; background: #4caf8220; }
    .hlw-reaction-btn.active-neu { border-color: #aaa; background: #aaa20; }
    .hlw-reaction-btn.active-neg { border-color: #e57373; background: #e5737320; }
    .hlw-notes-input {
      width: 100%; padding: 12px 14px; border-radius: 12px;
      border: 1.5px solid #e8e8e8; font-size: 13px; font-family: inherit;
      resize: none; outline: none; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .hlw-notes-input:focus { border-color: ${accent}; }
    .hlw-success {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 48px 24px; gap: 12px; text-align: center;
    }
    .hlw-success-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: ${accent}18; display: flex; align-items: center; justify-content: center;
      font-size: 24px;
    }
    .hlw-success-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
    .hlw-success-sub { font-size: 13px; color: #888; max-width: 260px; }
    .hlw-narrative-card {
      background: linear-gradient(135deg, #fdf6f0, #faf4ee);
      border: 1.5px solid #f0e4d7;
      border-radius: 16px;
      padding: 16px;
    }
    /* ── Photo upload ── */
    .hlw-photo-upload {
      width: 100%; height: 160px; border-radius: 14px;
      border: 2px dashed #e0d6cc; background: #faf6f0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; cursor: pointer; overflow: hidden;
      transition: border-color 0.15s, background 0.15s;
    }
    .hlw-photo-upload:hover { border-color: ${accent}; background: ${accent}08; }
    .hlw-photo-icon { font-size: 28px; }
    .hlw-photo-label { font-size: 12px; font-weight: 500; color: #999; }

    .hlw-streak {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 100px;
      background: ${accent}15; font-size: 13px; font-weight: 600; color: ${accent};
    }
  `
}
