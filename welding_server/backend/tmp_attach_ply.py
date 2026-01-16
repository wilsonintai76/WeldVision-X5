import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','weldvision.settings')
import django
django.setup()
from results.models import Assessment
from django.core.files import File

ply_content = '''ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
end_header
0 0 0
10 0 0
0 10 0
'''
with open('/app/tmp_sample.ply','w') as f:
    f.write(ply_content)

ass = Assessment.objects.get(pk=1)
with open('/app/tmp_sample.ply','rb') as f:
    ass.pointcloud_ply.save('sample_test_1.ply', File(f), save=True)
print('Saved PLY to assessment', ass.pk, '->', ass.pointcloud_ply.name)
