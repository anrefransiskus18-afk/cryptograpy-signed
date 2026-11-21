"""
Titik masuk WSGI untuk server produksi (mis. Gunicorn).

Jalankan dengan satu proses worker dan banyak thread, karena rantai hash log audit
disinkronkan dengan lock di dalam proses (bukan lintas proses):

    gunicorn --workers 1 --threads 8 --bind 0.0.0.0:8000 wsgi:app
"""
from app import create_app, init_database_and_seed

init_database_and_seed()
app = create_app()
