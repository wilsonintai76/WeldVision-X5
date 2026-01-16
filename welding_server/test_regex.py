import re

# Text simulated from the user's screenshot
pdf_text_sample = """
1 05DKM23F2014 NUR IQMA UMAIRA BINTI NUJAIMI DKM5A JKM
2 05DKM23F2999 ROBBIE GISANG ANAK BEGAU DKM5A JKM
3 05DKM23F1014 ARTHUR LAKA ANAK ANTHONY DKM6A JKM
"""

# Regex from views.py
student_pattern = re.compile(
    r'^\s*(\d+)\s+([A-Z0-9]+)\s+(.+?)\s+([A-Z0-9]+|KELAS)\s+([A-Z]+)\s*$',
    re.MULTILINE | re.IGNORECASE
)

print("Testing Regex Matches:")
matches = student_pattern.finditer(pdf_text_sample)
count = 0
for match in matches:
    count += 1
    bil, student_id, name, class_name, department = match.groups()
    print(f"Match {count}:")
    print(f"  BIL: {bil}")
    print(f"  ID: {student_id}")
    print(f"  Name: {name.strip()}")
    print(f"  Home Class: {class_name}")
    print(f"  Dept: {department}")
    print("-" * 20)

if count == 0:
    print("NO MATCHES FOUND")
else:
    print(f"Total Matches: {count}")
