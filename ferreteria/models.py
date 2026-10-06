from django.db import models

class Categoria(models.Model):
    nombre = models.CharField(max_length=50)
    
    def __str__(self):
        return self.nombre
    
class Producto(models.Model):    
    nombre = models.CharField(max_length=70)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    imagen = models.ImageField(upload_to="productos", blank=False, null=False)
    precio = models.DecimalField(max_digits=6, decimal_places=2)
    stock = models.IntegerField()
    
    def __str__(self):
        return self.nombre
    