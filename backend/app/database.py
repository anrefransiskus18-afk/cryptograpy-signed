import os
import socket
import subprocess
import time
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

def ensure_local_mysql_running():
    """Memastikan daemon MySQL 8 lokal berjalan jika tersedia di ~/.local/mysql8."""
    try:
        s = socket.socket()
        s.settimeout(0.5)
        if s.connect_ex(("127.0.0.1", 3306)) == 0:
            s.close()
            return True
        s.close()
    except Exception:
        pass

    mysql_dir = Path.home() / ".local" / "mysql8"
    mysqld_bin = mysql_dir / "root" / "usr" / "sbin" / "mysqld"
    if mysqld_bin.exists():
        env = os.environ.copy()
        lib1 = str(mysql_dir / "root" / "usr" / "lib" / "x86_64_linux-gnu")
        lib2 = str(mysql_dir / "root" / "usr" / "lib" / "x86_64-linux-gnu")
        lib3 = str(mysql_dir / "root" / "usr" / "lib" / "mysql" / "private")
        env["LD_LIBRARY_PATH"] = f"{lib1}:{lib2}:{lib3}:{env.get('LD_LIBRARY_PATH', '')}"
        for sub in ("data", "run", "log", "files"):
            (mysql_dir / sub).mkdir(parents=True, exist_ok=True)
        subprocess.Popen(
            [
                str(mysqld_bin),
                "--no-defaults",
                f"--basedir={mysql_dir / 'root' / 'usr'}",
                f"--datadir={mysql_dir / 'data'}",
                f"--socket={mysql_dir / 'run' / 'mysqld.sock'}",
                f"--pid-file={mysql_dir / 'run' / 'mysqld.pid'}",
                f"--log-error={mysql_dir / 'log' / 'error.log'}",
                f"--secure-file-priv={mysql_dir / 'files'}",
                "--bind-address=127.0.0.1",
                "--port=3306",
                "--mysqlx=0",
            ],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        for _ in range(12):
            time.sleep(0.5)
            try:
                s = socket.socket()
                s.settimeout(0.5)
                if s.connect_ex(("127.0.0.1", 3306)) == 0:
                    s.close()
                    return True
                s.close()
            except Exception:
                pass
    return False

mysql_ok = ensure_local_mysql_running()
DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent.parent / "hybrid_crypto.db"
_mysql_password = os.getenv("MYSQL_PASSWORD", "")

DATABASE_URL = os.getenv("DATABASE_URL") or (
    f"mysql+pymysql://ptxyz_user:{_mysql_password}@127.0.0.1:3306/hybrid_crypto_db?charset=utf8mb4"
    if (mysql_ok and _mysql_password)
    else f"sqlite:///{DEFAULT_SQLITE_PATH}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db_session():
    return SessionLocal()

