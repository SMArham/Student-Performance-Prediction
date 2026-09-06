import os
import sys
import threading
import time
import webbrowser
import uvicorn
from backend.app.config import settings

def open_browser(url: str):
    """Wait for server to boot and open default browser in local development."""
    time.sleep(1.5)
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    # Render and cloud providers pass PORT env var; locally default to APP_PORT (9005)
    port = int(os.environ.get('PORT', getattr(settings, 'APP_PORT', 9005)))
    host = '0.0.0.0'
    local_url = f"http://localhost:{port}"

    print("\n" + "=" * 62, flush=True)
    print("  STUDENT PERFORMANCE PREDICTION & ANALYTICS SYSTEM", flush=True)
    print("=" * 62, flush=True)
    print(f"  [+] Local Web Portal:  {local_url}", flush=True)
    print(f"  [+] Login / Register:  {local_url}/login.html", flush=True)
    print(f"  [+] Student Portal:    {local_url}/dashboard.html", flush=True)
    print(f"  [+] Teacher Portal:    {local_url}/teacher-dashboard.html", flush=True)
    print(f"  [+] Backend API Live:  {local_url}/api/v1/models", flush=True)
    print("=" * 62 + "\n", flush=True)
    sys.stdout.flush()

    # Automatically open the browser if running locally on development machine
    if os.environ.get('ENVIRONMENT', settings.ENVIRONMENT) != 'production' and not os.environ.get('PORT'):
        threading.Thread(target=open_browser, args=(local_url,), daemon=True).start()

    uvicorn.run(
        'backend.app.main:app',
        host=host,
        port=port,
        log_level='info',
        proxy_headers=True,
        forwarded_allow_ips='*'
    )
