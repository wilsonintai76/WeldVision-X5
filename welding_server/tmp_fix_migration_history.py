import sqlite3
import sys

db = '/app/db.sqlite3'
print('Opening DB:', db)
conn = sqlite3.connect(db)
cur = conn.cursor()
# Show problematic row
cur.execute("SELECT id, app, name, applied FROM django_migrations WHERE app='rubrics' AND name='0002_studentevaluation_assessment'")
row = cur.fetchone()
print('Found row:', row)
if row:
    cur.execute("DELETE FROM django_migrations WHERE app='rubrics' AND name='0002_studentevaluation_assessment'")
    conn.commit()
    print('Deleted rubrics.0002 entry from django_migrations')
else:
    print('No rubrics.0002 entry found; nothing to delete')

conn.close()
