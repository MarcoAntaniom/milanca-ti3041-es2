/**
 * FerreteríaPro - Frontend Logic
 * Controla: Búsqueda y filtrado en vivo, añadir al carrito con fetch() y cálculos dinámicos.
 */
document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. HELPERS: TOKEN CSRF Y TOASTS
    // =========================================================================
    function getCSRFToken() {
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfInput) return csrfInput.value;
        const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        return cookie ? cookie.split('=')[1] : '';
    }

    function mostrarToast(mensaje) {
        const toastEl = document.getElementById('toast-alerta');
        const mensajeEl = document.getElementById('toast-mensaje');
        if (toastEl && mensajeEl) {
            mensajeEl.textContent = mensaje;
            const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
            toast.show();
        }
    }

    function actualizarBadgeNavbar(totalItems) {
        const badge = document.getElementById('badge-carrito');
        if (badge) {
            badge.textContent = totalItems;
            if (parseInt(totalItems) > 0) {
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    // =========================================================================
    // 2. AÑADIR AL CARRITO MEDIANTE FETCH (Inicio y Catálogo)
    // =========================================================================
    document.querySelectorAll('.btn-agregar-carrito').forEach(boton => {
        boton.addEventListener('click', async (e) => {
            e.preventDefault();
            const productoId = boton.dataset.id;
            const nombre = boton.dataset.nombre || 'Producto';

            try {
                const response = await fetch(`/ferreteria/carrito/agregar/${productoId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ cantidad: 1 })
                });

                if (response.ok) {
                    const data = await response.json().catch(() => null);
                    if (data && data.total_items !== undefined) {
                        actualizarBadgeNavbar(data.total_items);
                    } else {
                        // Si la vista aún devuelve redirect normal, sumamos 1 visualmente
                        const badge = document.getElementById('badge-carrito');
                        const actual = parseInt(badge?.textContent || '0') + 1;
                        actualizarBadgeNavbar(actual);
                    }
                    mostrarToast(`¡${nombre} añadido al carro!`);
                }
            } catch (error) {
                console.error('Error al agregar al carrito:', error);
            }
        });
    });

    // =========================================================================
    // 3. FILTRADO Y BÚSQUEDA EN TIEMPO REAL (Catálogo)
    // =========================================================================
    const inputBuscador = document.getElementById('buscador-vivo');
    const botonesCategoria = document.querySelectorAll('.item-categoria');
    const tarjetasProductos = document.querySelectorAll('.tarjeta-producto');
    const contenedorSinResultados = document.getElementById('sin-resultados-js');
    let categoriaActiva = 'todas';

    function ejecutarFiltroCatalogo() {
        if (!tarjetasProductos.length) return;

        const query = inputBuscador ? inputBuscador.value.toLowerCase().trim() : '';
        let productosVisibles = 0;

        tarjetasProductos.forEach(tarjeta => {
            const nombre = tarjeta.dataset.nombre || '';
            const categoria = tarjeta.dataset.categoria || '';

            const coincideNombre = nombre.includes(query);
            const coincideCat = (categoriaActiva === 'todas' || categoria === categoriaActiva);

            if (coincideNombre && coincideCat) {
                tarjeta.classList.remove('d-none');
                productosVisibles++;
            } else {
                tarjeta.classList.add('d-none');
            }
        });

        if (contenedorSinResultados) {
            if (productosVisibles === 0) {
                contenedorSinResultados.classList.remove('d-none');
            } else {
                contenedorSinResultados.classList.add('d-none');
            }
        }
    }

    if (inputBuscador) {
        inputBuscador.addEventListener('input', ejecutarFiltroCatalogo);
    }

    botonesCategoria.forEach(btn => {
        btn.addEventListener('click', () => {
            botonesCategoria.forEach(b => b.classList.remove('active', 'fw-bold'));
            btn.classList.add('active', 'fw-bold');
            categoriaActiva = btn.dataset.categoria;
            ejecutarFiltroCatalogo();
        });
    });

    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if (inputBuscador) inputBuscador.value = '';
            categoriaActiva = 'todas';
            botonesCategoria.forEach(b => {
                b.classList.remove('active', 'fw-bold');
                if (b.dataset.categoria === 'todas') b.classList.add('active', 'fw-bold');
            });
            ejecutarFiltroCatalogo();
        });
    }

    // =========================================================================
    // 4. CÁLCULO DINÁMICO DE TOTALES Y CANTIDADES (Carrito)
    // =========================================================================
    const filasProducto = document.querySelectorAll('.fila-producto');

    function sincronizarTotalesCarrito() {
        let subtotalNeto = 0;
        let totalArticulos = 0;

        const filas = document.querySelectorAll('.fila-producto');

        if (filas.length === 0) {
            const panelActivo = document.getElementById('contenedor-carrito-activo');
            const avisoVacio = document.getElementById('carrito-vacio-aviso');
            if (panelActivo) panelActivo.classList.add('d-none');
            if (avisoVacio) avisoVacio.classList.remove('d-none');
            actualizarBadgeNavbar(0);
            return;
        }

        filas.forEach(fila => {
            const precio = parseFloat(fila.dataset.precio);
            const input = fila.querySelector('.input-cantidad');
            const cantidad = parseInt(input.value);
            const subtotalFila = precio * cantidad;

            // Actualiza la celda de subtotal de la fila
            const subtotalEl = fila.querySelector('.subtotal-fila');
            if (subtotalEl) subtotalEl.textContent = `$${subtotalFila.toLocaleString('es-CL')}`;

            subtotalNeto += subtotalFila;
            totalArticulos += cantidad;
        });

        const iva = Math.round(subtotalNeto * 0.19);
        const total = subtotalNeto + iva;

        // Actualizar resumen lateral
        const resumenNeto = document.getElementById('resumen-neto');
        const resumenIva = document.getElementById('resumen-iva');
        const resumenTotal = document.getElementById('resumen-total');

        if (resumenNeto) resumenNeto.textContent = `$${subtotalNeto.toLocaleString('es-CL')}`;
        if (resumenIva) resumenIva.textContent = `$${iva.toLocaleString('es-CL')}`;
        if (resumenTotal) resumenTotal.textContent = `$${total.toLocaleString('es-CL')}`;

        actualizarBadgeNavbar(totalArticulos);
    }

    // Notificar al backend de un cambio de cantidad
    async function enviarActualizacionBackend(productoId, nuevaCantidad) {
        try {
            await fetch(`/ferreteria/carrito/actualizar/${productoId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ cantidad: nuevaCantidad })
            });
        } catch (err) {
            console.error('Error al sincronizar cantidad:', err);
        }
    }

    filasProducto.forEach(fila => {
        const btnSumar = fila.querySelector('.btn-sumar');
        const btnRestar = fila.querySelector('.btn-restar');
        const inputCantidad = fila.querySelector('.input-cantidad');
        const stockMax = parseInt(fila.dataset.stock);
        const productoId = fila.dataset.id;

        if (btnSumar && inputCantidad) {
            btnSumar.addEventListener('click', () => {
                let actual = parseInt(inputCantidad.value);
                if (actual < stockMax) {
                    inputCantidad.value = actual + 1;
                    sincronizarTotalesCarrito();
                    enviarActualizacionBackend(productoId, actual + 1);
                } else {
                    mostrarToast(`Stock máximo disponible alcanzado (${stockMax})`);
                }
            });
        }

        if (btnRestar && inputCantidad) {
            btnRestar.addEventListener('click', () => {
                let actual = parseInt(inputCantidad.value);
                if (actual > 1) {
                    inputCantidad.value = actual - 1;
                    sincronizarTotalesCarrito();
                    enviarActualizacionBackend(productoId, actual - 1);
                }
            });
        }

        const btnEliminar = fila.querySelector('.btn-eliminar-fila');
        if (btnEliminar) {
            btnEliminar.addEventListener('click', async () => {
                fila.remove();
                sincronizarTotalesCarrito();
                await fetch(`/ferreteria/carrito/eliminar/${productoId}/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCSRFToken() }
                });
                mostrarToast('Producto eliminado del carrito');
            });
        }
    });

    // Vaciar todo el carrito
    const btnVaciarTodo = document.getElementById('btn-vaciar-todo');
    if (btnVaciarTodo) {
        btnVaciarTodo.addEventListener('click', async () => {
            document.querySelectorAll('.fila-producto').forEach(f => f.remove());
            sincronizarTotalesCarrito();
            await fetch('/ferreteria/carrito/vaciar/', {
                method: 'POST',
                headers: { 'X-CSRFToken': getCSRFToken() }
            });
            mostrarToast('Se vació el carrito');
        });
    }

    // =========================================================================
    // 5. PROCESAR PAGO SIMBÓLICO
    // =========================================================================
    const btnPago = document.getElementById('btn-proceder-pago');
    if (btnPago) {
        btnPago.addEventListener('click', async () => {
            btnPago.disabled = true;
            btnPago.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

            try {
                const response = await fetch('/ferreteria/carrito/compra/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const data = await response.json();

                if (data.ok) {
                    mostrarToast('¡Compra Exitosa!');
                    
                    // Ocultar la tabla de productos y mostrar el estado vacío
                    const panelActivo = document.getElementById('contenedor-carrito-activo');
                    const avisoVacio = document.getElementById('carrito-vacio-aviso');
                    
                    if (panelActivo) panelActivo.classList.add('d-none');
                    if (avisoVacio) {
                        avisoVacio.classList.remove('d-none');
                        // Mensaje de confirmación en la tarjeta vacía
                        avisoVacio.querySelector('h4').textContent = '¡Gracias por tu compra!';
                        avisoVacio.querySelector('p').textContent = 'Tu pedido ha sido procesado y el stock ha sido actualizado con éxito.';
                    }
                    
                    actualizarBadgeNavbar(0);
                } else {
                    mostrarToast(data.mensaje || 'Hubo un error al procesar la compra.');
                    btnPago.disabled = false;
                    btnPago.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Proceder al Pago';
                }
            } catch (error) {
                console.error('Error al procesar el pago:', error);
                mostrarToast('Error de conexión al procesar el pago.');
                btnPago.disabled = false;
                btnPago.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Proceder al Pago';
            }
        });
    }
});
