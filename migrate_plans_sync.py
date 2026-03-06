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
    cursor.execute("ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'gratuito'")
    conn.commit()
    
    with open("db_mig_result.txt", "w") as f:
        f.write("Sucesso!")
        
    conn.close()
except Exception as e:
    with open("db_mig_result.txt", "w") as f:
        f.write(f"Erro: {e}")
