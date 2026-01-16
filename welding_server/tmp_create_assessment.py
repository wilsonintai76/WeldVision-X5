import os, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','weldvision.settings')
import django
django.setup()
from core.models import Student
from results.models import Assessment
s, created = Student.objects.get_or_create(student_id='TEST123', defaults={'name':'Test Student'})
a = Assessment.objects.create(student=s, metrics_json={}, mesh_preview_json={'points':[[0,0,0],[10,0,0],[0,10,0]], 'colors':[[255,0,0],[0,255,0],[0,0,255]], 'bounds':{'min':[0,0,0],'max':[10,10,0]}, 'count':3})
print('CREATED_ASSESSMENT',a.pk)
