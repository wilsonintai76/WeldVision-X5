import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'weldvision.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
User = get_user_model()

try:
    user = User.objects.get(username='0000')
    print(f"User found: {user.username}")
    print(f"Is active: {user.is_active}")
    print(f"Is approved: {user.is_approved}")
    print(f"Is superuser: {user.is_superuser}")
    print(f"Role: {user.role}")
    
    auth_user = authenticate(username='0000', password='1234')
    if auth_user:
        print("Authentication SUCCESS with 1234")
    else:
        print("Authentication FAILED with 1234")
except User.DoesNotExist:
    print("User 0000 does not exist in DB!")
