from django.db import models
import uuid
from django.contrib.auth.models import User

class IntersectieSalvata(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nume = models.CharField(max_length=100)
    data = models.JSONField()  # PostgreSQL native JSON field
    data_adaugare = models.DateTimeField(auto_now_add=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="intersectii", default = None)