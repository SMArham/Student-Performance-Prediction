import os
import sys
import uvicorn

if __name__ == '__main__':
    port = int(os.environ.get('PORT', os.environ.get('APP_PORT', 10000)))
    host = '0.0.0.0'
    print(f'--> [Production Server] Starting on {host}:{port}...', flush=True)
    sys.stdout.flush()

    uvicorn.run(
        'backend.app.main:app',
        host=host,
        port=port,
        log_level='info',
        proxy_headers=True,
        forwarded_allow_ips='*'
    )
