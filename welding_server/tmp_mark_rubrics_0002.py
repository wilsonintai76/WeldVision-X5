import sqlite3

db = '/app/db.sqlite3'
print('Opening DB:', db)
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("SELECT id FROM django_migrations WHERE app='rubrics' AND name='0002_studentevaluation_assessment'")
if cur.fetchone():
    print('rubrics.0002 already present')
else:
    cur.execute("INSERT INTO django_migrations (app, name, applied) VALUES ('rubrics','0002_studentevaluation_assessment', datetime('now'))")
    conn.commit()
    print('Inserted rubrics.0002 into django_migrations')
conn.close()
