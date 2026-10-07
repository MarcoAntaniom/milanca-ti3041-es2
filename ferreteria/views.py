from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from .models import Producto, Categoria
from decimal import Decimal

# Create your views here.

def inicio(request):
    # [:8] sirve para dejar solo los 8 primeros productos en la pagina de inicio.
    productos = Producto.objects.select_related('categoria').all()[:8]

    carrito = request.session.get('carrito', {})
    total_items_carrito = sum(carrito.values())

    context = {
        "productos": productos,
        "total_items_carrito": total_items_carrito
    }

    return render(request, 'inicio.html', context)

def catalogo(request):
    productos = Producto.objects.all()
    categoria = Categoria.objects.all()

    carrito = request.session.get('carrito', {})
    total_items_carrito = sum(carrito.values())

    context = {
        "productos": productos,
        "categoria": categoria,
        "total_items_carrito": total_items_carrito
    }

    return render(request, "catalogo.html", context)

def ver_carrito(request):
    carrito = request.session.get('carrito', {})

    items_carrito = []
    subtotal_neto = Decimal("0")

    for prod_id, cantidad in carrito.items():
        try:
            producto = Producto.objects.get(id=prod_id)
            subtotal = producto.precio * cantidad
            subtotal_neto += subtotal

            items_carrito.append({
                "producto": producto,
                "cantidad": cantidad,
                "subtotal": subtotal
            })

        except Producto.DoesNotExist:
            continue

    total_iva = round(subtotal_neto * Decimal("0.19"))
    total_general = subtotal_neto + total_iva
    total_items_carrito = sum(carrito.values())

    context = {
        "items_carrito": items_carrito,
        "subtotal_neto": subtotal_neto,
        "total_iva": total_iva,
        "total_general": total_general,
        "total_items_carrito": total_items_carrito
    }

    return render(request, "carrito.html", context)

def agregar_al_carrito(request, producto_id):
    if request.method == 'POST':
        carrito = request.session.get('carrito', {})
        str_id = str(producto_id)
        cantidad = int(request.POST.get('cantidad', 1))

        carrito[str_id] = carrito.get(str_id, 0) + cantidad
        request.session['carrito'] = carrito
        request.session.modified = True

        total_items = sum(carrito.values())

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'total_items': total_items})

    return redirect('/ferreteria/carrito/')

def actualizar_carrito(request, producto_id):
    if request.method == 'POST':
        carrito = request.session.get('carrito', {})
        str_id = str(producto_id)
        cantidad = int(request.POST.get('cantidad', 1))

        if cantidad > 0:
            carrito[str_id] = cantidad
        else:
            carrito.pop(str_id, None)

        request.session['carrito'] = carrito
        request.session.modified = True

        total_items = sum(carrito.values())

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'total_items': total_items})

    return redirect('/ferreteria/carrito/')

def eliminar_del_carrito(request, producto_id):
    if request.method == 'POST':
        carrito = request.session.get('carrito', {})
        str_id = str(producto_id)

        if str_id in carrito:
            del carrito[str_id]
            request.session['carrito'] = carrito
            request.session.modified = True

        total_items = sum(carrito.values())

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'total_items': total_items})

    return redirect('/ferreteria/carrito/')

def vaciar_carrito(request):
    if request.method == 'POST':
        request.session['carrito'] = {}
        request.session.modified = True

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'total_items': 0})

    return redirect('/ferreteria/carrito/')

def compra(request):
    if request.method == 'POST':
        carrito = request.session.get('carrito', {})
        
        if not carrito:
            return JsonResponse({'ok': False, 'mensaje': 'El carrito está vacío.'})

        for prod_id, cantidad in carrito.items():
            try:
                producto = Producto.objects.get(id=int(prod_id))
                cantidad = int(cantidad)
                producto.stock = max(0, producto.stock - cantidad)
                producto.save()
            except (Producto.DoesNotExist, ValueError):
                continue

        request.session['carrito'] = {}
        request.session.modified = True

        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'ok': True, 'mensaje': 'Compra Exitosa'})

    return redirect('/ferreteria/carrito/')
