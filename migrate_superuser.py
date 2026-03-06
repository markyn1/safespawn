import os
import pymysql

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "content_creator_db")

try:
    conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE users ADD COLUMN is_superuser TINYINT(1) DEFAULT 0")
    conn.commit()
    conn.close()
    print("OK: coluna is_superuser adicionada!")
except Exception as e:
    print(f"ERRO ou ja existe: {e}")
