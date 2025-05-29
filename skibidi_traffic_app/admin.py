from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import IntersectieSalvata

@admin.register(IntersectieSalvata)
class IntersectieAdmin(admin.ModelAdmin):
    list_display = ("nume", "data_adaugare", "data")
