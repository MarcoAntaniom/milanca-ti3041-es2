from django.contrib import admin
from .models import Producto, Categoria

class CategoriaAdmin(admin.ModelAdmin):
    search_fields = ["nombre"]
    list_display = ("id", "nombre")
    
class ProductoAdmin(admin.ModelAdmin):
    search_fields = ["nombre"]
    list_filter = ["nombre", "precio"]
    list_display = ("id", "nombre", "categoria", "imagen", "precio", "stock")

admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Producto, ProductoAdmin)
