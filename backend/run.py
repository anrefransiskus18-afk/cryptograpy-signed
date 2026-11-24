import os
from app import create_app, init_database_and_seed

app = create_app()

if __name__ == "__main__":
    init_database_and_seed()
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    app.run(host=host, port=port, debug=False)
