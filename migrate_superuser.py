import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='', database='content_creator_db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE users ADD COLUMN is_superuser TINYINT(1) DEFAULT 0")
    conn.commit()
    conn.close()
    print("OK: coluna is_superuser adicionada!")
except Exception as e:
    print(f"ERRO ou ja existe: {e}")
