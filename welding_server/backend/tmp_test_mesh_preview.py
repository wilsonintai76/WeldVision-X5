import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','weldvision.settings')
import django
django.setup()
from django.test import Client
from accounts.models import User

client = Client()
# create or get test admin
u, created = User.objects.get_or_create(username='__test_admin__', defaults={'email':'test@example.com'})
if created:
    u.set_password('testpass')
    u.is_superuser = True
    u.is_staff = True
    u.save()

client.force_login(u)

resp = client.get('/api/assessments/1/mesh-preview/')
print('mesh-preview status:', resp.status_code)
print(resp.content.decode('utf-8'))

resp2 = client.get('/api/assessments/1/download-ply/')
print('download-ply status:', resp2.status_code)
print('Headers:', dict(resp2.items()))
# If file content, print first 200 bytes
try:
    content = resp2.content
    print('PLY bytes preview:', content[:200])
except Exception as e:
    print('Error reading PLY content:', e)
