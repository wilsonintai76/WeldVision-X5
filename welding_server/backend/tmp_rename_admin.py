import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'weldvision.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Handle renaming the existing admin user to '0000'
try:
    admin_user = User.objects.get(username='admin')
    admin_user.username = '0000'
    admin_user.set_password('1234')
    admin_user.save()
    print("Renamed existing 'admin' to '0000' and PIN '1234'")
except User.DoesNotExist:
    # Check if 0000 exists
    user, created = User.objects.get_or_create(username='0000')
    user.set_password('1234')
    user.is_superuser = True
    user.is_staff = True
    user.role = User.Role.ADMIN
    user.save()
    if created:
        print("Created new admin user '0000' with PIN '1234'")
    else:
        print("Updated auth for '0000' with PIN '1234'")
