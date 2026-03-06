import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='', database='content_creator_db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'gratuito'")
    conn.commit()
    
    with open("db_mig_result.txt", "w") as f:
        f.write("Sucesso!")
        
    conn.close()
except Exception as e:
    with open("db_mig_result.txt", "w") as f:
        f.write(f"Erro: {e}")
