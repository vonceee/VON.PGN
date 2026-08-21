import { AngularAppEngine } from '@angular/ssr';

const angularApp = new AngularAppEngine();

function getFallbackErrorPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Service Down • vonchess.net</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-subtle: #f8fafc;
      --text-gray-500: #64748b;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --border-base: #e2e8f0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      border: 1px solid var(--border-base);
      border-radius: 24px;
      padding: 48px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      animation: fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-container {
      width: 80px;
      height: 80px;
      background-color: rgba(37, 99, 235, 0.08);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 32px;
      position: relative;
    }
    .icon-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(37, 99, 235, 0.2);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0; }
    }
    h1 {
      font-size: 32px;
      font-weight: 500;
      margin-bottom: 12px;
    }
    p {
      font-size: 16px;
      color: var(--text-gray-500);
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      background-color: var(--accent);
      color: #ffffff;
      padding: 12px 32px;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      font-size: 16px;
      font-family: inherit;
    }
    .btn:hover {
      background-color: var(--accent-hover);
      transform: translateY(-1px);
    }
    .btn:active {
      transform: translateY(0);
    }
    .footer-note {
      margin-top: 24px;
      font-size: 12px;
      color: var(--text-gray-500);
    }
  </style>
  <script>
    // Auto refresh the page every 15 seconds to check if service recovered
    setTimeout(() => {
      window.location.reload();
    }, 15000);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <div class="icon-pulse"></div>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h1>vonchess is temporarily offline</h1>
    <p>We are experiencing technical difficulties. We are working to resolve the issue — please try again in a few minutes.</p>
    <div class="footer-note">Service Unavailable</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const response = await angularApp.handle(request);
      if (response && response.status >= 500) {
        return getFallbackErrorPage();
      }
      return response ?? new Response('Not Found', { status: 404 });
    } catch (err) {
      console.error('SSR render failed:', err);
      return getFallbackErrorPage();
    }
  },
};
