from django.contrib import admin
from .models import Rubric


@admin.register(Rubric)
class RubricAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'total_weight_display', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Geometric Weights (%)', {
            'fields': (
                'weight_reinforcement_height',
                'weight_bead_width',
                'weight_undercut',
                'weight_hi_lo',
            )
        }),
        ('Visual Defect Weights (%)', {
            'fields': (
                'weight_porosity',
                'weight_spatter',
                'weight_slag_inclusion',
                'weight_burn_through',
            )
        }),
        ('Tolerance Ranges (mm)', {
            'fields': (
                ('height_min', 'height_max'),
                ('width_min', 'width_max'),
                'undercut_max',
                'hi_lo_max',
            )
        }),
        ('Defect Count Thresholds', {
            'fields': (
                'porosity_threshold',
                'spatter_threshold',
                'slag_threshold',
                'burn_through_threshold',
            )
        }),
    )
    
    def total_weight_display(self, obj):
        total = obj.total_weight()
        return f"{total:.1f}%"
    total_weight_display.short_description = 'Total Weight'
