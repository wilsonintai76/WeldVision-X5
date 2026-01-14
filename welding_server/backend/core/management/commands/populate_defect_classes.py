"""
Management command to populate default defect classes
"""
from django.core.management.base import BaseCommand
from core.models import DefectClass


class Command(BaseCommand):
    help = 'Populate default defect classes with colors'

    def handle(self, *args, **options):
        default_classes = [
            {'name': 'porosity', 'display_name': 'Porosity', 'color': '#EF4444', 'description': 'Gas pores in weld'},
            {'name': 'crack', 'display_name': 'Crack', 'color': '#F59E0B', 'description': 'Weld cracks'},
            {'name': 'overlap', 'display_name': 'Overlap', 'color': '#10B981', 'description': 'Weld overlap defect'},
            {'name': 'spatter', 'display_name': 'Spatter', 'color': '#3B82F6', 'description': 'Weld spatter'},
            {'name': 'undercut', 'display_name': 'Undercut', 'color': '#8B5CF6', 'description': 'Weld undercut'},
            {'name': 'slag_inclusion', 'display_name': 'Slag Inclusion', 'color': '#EC4899', 'description': 'Slag trapped in weld'},
            {'name': 'incomplete_fusion', 'display_name': 'Incomplete Fusion', 'color': '#14B8A6', 'description': 'Lack of fusion'},
            {'name': 'burn_through', 'display_name': 'Burn Through', 'color': '#F97316', 'description': 'Excessive penetration'},
            {'name': 'void', 'display_name': 'Void', 'color': '#06B6D4', 'description': 'Voids or cavities'},
            {'name': 'other', 'display_name': 'Other Defect', 'color': '#6B7280', 'description': 'Miscellaneous defects'},
        ]

        created_count = 0
        for cls_data in default_classes:
            obj, created = DefectClass.objects.get_or_create(
                name=cls_data['name'],
                defaults={
                    'display_name': cls_data['display_name'],
                    'color': cls_data['color'],
                    'description': cls_data['description']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {obj.display_name} ({obj.color})')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'- Already exists: {obj.display_name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nCreated {created_count} new defect classes')
        )
