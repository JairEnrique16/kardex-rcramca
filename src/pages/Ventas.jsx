import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Ventas() {
  const { user, perfil } = useAuth()
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [carrito, setCarrito] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [clienteOcasional, setClienteOcasional] = useState('')
  const [tipoCliente, setTipoCliente] = useState('minorista')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaMarca, setBusquedaMarca] = useState('')
  const [loading, setLoading] = useState(false)
  const [ventaRegistrada, setVentaRegistrada] = useState(null)
  const [mostrarRecibo, setMostrarRecibo] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const reciboRef = useRef(null)

  useEffect(() => {
    cargarProductos()
    cargarClientes()
  }, [])

  async function cargarProductos() {
    const { data: productosData } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('activo', true)
      .order('nombre')

    const { data: stockData } = await supabase
      .from('stock')
      .select('*, ubicaciones(nombre, tipo)')

    const productosConStock = (productosData || []).map(p => {
      const stocks = (stockData || []).filter(s => s.id_producto === p.id_producto)
      const totalStock = stocks.reduce((sum, s) => sum + s.cantidad_actual, 0)
      return { ...p, stocks, totalStock }
    }).filter(p => p.totalStock > 0)

    setProductos(productosConStock)
  }

  async function cargarClientes() {
    const { data } = await supabase.from('clientes').select('*').order('nombre_razon_social')
    setClientes(data || [])
  }

  // ---- Precio combinado: por cliente mayorista registrado, o por cantidad del producto en el carrito ----
  function clienteEsMayorista() {
    return clienteSeleccionado ? clienteSeleccionado.tipo === 'mayorista' : tipoCliente === 'mayorista'
  }

  function totalCantidadItem(item) {
    return item.desglose.reduce((s, d) => s + d.cantidad, 0)
  }

  function precioUnitarioItem(item) {
    const cantidadTotal = totalCantidadItem(item)
    const umbral = item.cantidad_minima_mayorista || 6
    const aplicaMayorista = item.precio_mayorista && (clienteEsMayorista() || cantidadTotal >= umbral)
    return aplicaMayorista ? parseFloat(item.precio_mayorista) : parseFloat(item.precio_minorista || 0)
  }

  function subtotalItem(item) {
    return precioUnitarioItem(item) * totalCantidadItem(item)
  }

  function getPrecioCatalogo(producto) {
    // Precio de referencia en el catálogo (antes de saber la cantidad final)
    if (clienteEsMayorista() && producto.precio_mayorista) return parseFloat(producto.precio_mayorista)
    return parseFloat(producto.precio_minorista || producto.precio_referencia || 0)
  }

  // ---- Carrito agrupado por producto, con desglose por almacén ----
  function agregarAlCarrito(producto, stockSeleccionado) {
    const itemExistente = carrito.find(i => i.id_producto === producto.id_producto)
    const filaExistente = itemExistente?.desglose.find(d => d.id_ubicacion === stockSeleccionado.id_ubicacion)
    const cantidadEnEseAlmacen = filaExistente?.cantidad || 0

    if (cantidadEnEseAlmacen >= stockSeleccionado.cantidad_actual) {
      alert('No hay suficiente stock en este almacén')
      return
    }

    if (!itemExistente) {
      setCarrito([...carrito, {
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        marca: producto.marca || '',
        unidad_medida: producto.unidad_medida,
        precio_minorista: producto.precio_minorista || producto.precio_referencia || 0,
        precio_mayorista: producto.precio_mayorista || null,
        cantidad_minima_mayorista: producto.cantidad_minima_mayorista || 6,
        desglose: [{
          id_ubicacion: stockSeleccionado.id_ubicacion,
          nombre_ubicacion: stockSeleccionado.ubicaciones?.nombre,
          cantidad: 1,
          stockDisponible: stockSeleccionado.cantidad_actual,
        }],
      }])
      return
    }

    setCarrito(carrito.map(item => {
      if (item.id_producto !== producto.id_producto) return item
      const yaTieneAlmacen = item.desglose.some(d => d.id_ubicacion === stockSeleccionado.id_ubicacion)
      const nuevoDesglose = yaTieneAlmacen
        ? item.desglose.map(d => d.id_ubicacion === stockSeleccionado.id_ubicacion ? { ...d, cantidad: d.cantidad + 1 } : d)
        : [...item.desglose, {
            id_ubicacion: stockSeleccionado.id_ubicacion,
            nombre_ubicacion: stockSeleccionado.ubicaciones?.nombre,
            cantidad: 1,
            stockDisponible: stockSeleccionado.cantidad_actual,
          }]
      return { ...item, desglose: nuevoDesglose }
    }))
  }

  function cambiarCantidadAlmacen(id_producto, id_ubicacion, delta) {
    const item = carrito.find(i => i.id_producto === id_producto)
    if (!item) return
    const fila = item.desglose.find(d => d.id_ubicacion === id_ubicacion)
    if (!fila) return
    const nuevaCantidad = fila.cantidad + delta

    if (nuevaCantidad > fila.stockDisponible) {
      alert('Stock insuficiente en este almacén. Disponible: ' + fila.stockDisponible)
      return
    }

    if (nuevaCantidad <= 0) {
      const nuevoDesglose = item.desglose.filter(d => d.id_ubicacion !== id_ubicacion)
      if (nuevoDesglose.length === 0) {
        setCarrito(carrito.filter(i => i.id_producto !== id_producto))
      } else {
        setCarrito(carrito.map(i => i.id_producto === id_producto ? { ...i, desglose: nuevoDesglose } : i))
      }
      return
    }

    setCarrito(carrito.map(i => i.id_producto === id_producto
      ? { ...i, desglose: i.desglose.map(d => d.id_ubicacion === id_ubicacion ? { ...d, cantidad: nuevaCantidad } : d) }
      : i
    ))
  }

  function quitarProductoDelCarrito(id_producto) {
    setCarrito(carrito.filter(i => i.id_producto !== id_producto))
  }

  function calcularTotal() {
    return carrito.reduce((sum, item) => sum + subtotalItem(item), 0).toFixed(2)
  }

  function getNombreCliente() {
    if (clienteSeleccionado) return clienteSeleccionado.nombre_razon_social
    if (clienteOcasional.trim()) return clienteOcasional.trim()
    return 'Cliente ocasional'
  }

  // ---- Paso 1: abrir resumen de confirmación (NO escribe nada en la base todavía) ----
  function handleAbrirConfirmacion() {
    if (carrito.length === 0) {
      alert('El carrito está vacío')
      return
    }
    setMostrarConfirmacion(true)
  }

  function handleCancelarVenta() {
    setMostrarConfirmacion(false)
    // No se toca el carrito ni la base de datos: la venta simplemente no ocurre.
  }

  // ---- Paso 2: esto SÍ escribe en la base, solo se llama al confirmar de verdad ----
  async function handleProcesarVenta() {
    setLoading(true)

    const itemsSnapshot = carrito.map(item => ({
      id_producto: item.id_producto,
      nombre: item.nombre,
      marca: item.marca,
      precioUnitario: precioUnitarioItem(item),
      cantidadTotal: totalCantidadItem(item),
      desglose: item.desglose,
    }))

    const totalVenta = itemsSnapshot.reduce((sum, it) => sum + it.precioUnitario * it.cantidadTotal, 0)

    const { data: venta, error: ventaError } = await supabase
      .from('ventas_cabecera')
      .insert({
        id_cliente: clienteSeleccionado?.id_cliente || null,
        cliente_ocasional: !clienteSeleccionado ? (clienteOcasional.trim() || null) : null,
        total_venta: parseFloat(totalVenta.toFixed(2)),
        id_usuario: user.id,
      })
      .select()
      .single()

    if (ventaError) {
      alert('Error: ' + ventaError.message)
      setLoading(false)
      return
    }

    for (const item of itemsSnapshot) {
      await supabase.from('ventas_detalle').insert({
        id_venta: venta.id_venta,
        id_producto: item.id_producto,
        cantidad: item.cantidadTotal,
        precio_aplicado: item.precioUnitario,
        subtotal: item.precioUnitario * item.cantidadTotal,
      })

      const { data: movimiento } = await supabase
        .from('movimientos')
        .insert({
          tipo: 'salida_venta',
          id_usuario: user.id,
          observacion: `Venta #${venta.id_venta} - ${item.nombre} - ${getNombreCliente()}`,
        })
        .select()
        .single()

      for (const fila of item.desglose) {
        const { data: stockRow } = await supabase
          .from('stock')
          .select('*')
          .eq('id_producto', item.id_producto)
          .eq('id_ubicacion', fila.id_ubicacion)
          .single()

        if (stockRow) {
          await supabase
            .from('stock')
            .update({ cantidad_actual: stockRow.cantidad_actual - fila.cantidad })
            .eq('id_stock', stockRow.id_stock)
        }

        await supabase.from('detalle_movimientos').insert({
          id_movimiento: movimiento.id_movimiento,
          id_producto: item.id_producto,
          id_ubicacion_origen: fila.id_ubicacion,
          cantidad: fila.cantidad,
        })
      }
    }

    setVentaRegistrada({
      ...venta,
      items: itemsSnapshot,
      nombreCliente: getNombreCliente(),
      tipoCliente: clienteSeleccionado?.tipo || tipoCliente,
      vendedor: perfil?.nombre || 'Vendedor',
      fecha: new Date(),
    })

    setCarrito([])
    setClienteSeleccionado(null)
    setClienteOcasional('')
    setTipoCliente('minorista')
    cargarProductos()
    setLoading(false)
    setMostrarConfirmacion(false)
    setMostrarRecibo(true)
  }

  const productosFiltrados = productos
    .filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      (busquedaMarca === '' || (p.marca || '').toLowerCase().includes(busquedaMarca.toLowerCase()))
    )
    .slice(0, 20)

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Registrar Venta</h2>

      {/* Modal de confirmación PREVIA — nada se guarda hasta aquí */}
      {mostrarConfirmacion && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '28px',
            width: '380px', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '800', color: '#111827' }}>
              Confirmar venta
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              Cliente: <strong>{getNombreCliente()}</strong>
            </p>

            <div style={{ marginBottom: '16px' }}>
              {carrito.map(item => (
                <div key={item.id_producto} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    {totalCantidadItem(item)} x {item.nombre}
                    {' '}
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      ({precioUnitarioItem(item) === parseFloat(item.precio_mayorista) ? 'mayorista' : 'minorista'})
                    </span>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                    S/ {subtotalItem(item).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: '800' }}>TOTAL</span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>S/ {calcularTotal()}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCancelarVenta}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #e5e7eb',
                  background: 'white', color: '#374151', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
                }}>
                Cancelar
              </button>
              <button
                onClick={handleProcesarVenta}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #064e3b, #059669)',
                  color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.6 : 1
                }}>
                {loading ? 'Procesando...' : 'Sí, confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarRecibo && ventaRegistrada && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div ref={reciboRef} style={{
            background: 'white', borderRadius: '16px', padding: '32px',
            width: '380px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px dashed #e5e7eb', paddingBottom: '16px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #064e3b, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px'
              }}>
                <span style={{ color: 'white', fontSize: '18px', fontWeight: '900' }}>RC</span>
              </div>
              <h2 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '800', color: '#064e3b' }}>RC RAMCA Perú</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Productos Naturales</p>
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                {ventaRegistrada.fecha.toLocaleString('es-PE')}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              {[
                { label: 'N° Venta:', value: `#${ventaRegistrada.id_venta}` },
                { label: 'Cliente:', value: ventaRegistrada.nombreCliente },
                { label: 'Tipo:', value: ventaRegistrada.tipoCliente },
                { label: 'Vendedor:', value: ventaRegistrada.vendedor },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed #e5e7eb', marginBottom: '12px' }}></div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Producto</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Subtotal</span>
              </div>
              {ventaRegistrada.items.map((item, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', flex: 1 }}>{item.nombre}</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#059669' }}>
                      S/ {(item.precioUnitario * item.cantidadTotal).toFixed(2)}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {item.cantidadTotal} x S/ {item.precioUnitario} — {item.desglose.map(d => `${d.cantidad} en ${d.nombre_ubicacion}`).join(' + ')}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '2px dashed #e5e7eb', marginBottom: '12px' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>TOTAL</span>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#059669' }}>
                S/ {ventaRegistrada.total_venta}
              </span>
            </div>

            <div style={{ textAlign: 'center', borderTop: '1px dashed #e5e7eb', paddingTop: '12px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>¡Gracias por su compra!</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>RC RAMCA Perú — Productos Naturales</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => window.print()} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #064e3b, #059669)',
                color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}>🖨️ Imprimir</button>
              <button onClick={() => setMostrarRecibo(false)} style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #e5e7eb',
                background: 'white', color: '#374151', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Cliente</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select
                value={clienteSeleccionado?.id_cliente || ''}
                onChange={(e) => {
                  const cliente = clientes.find(c => c.id_cliente === parseInt(e.target.value))
                  setClienteSeleccionado(cliente || null)
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Cliente ocasional</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombre_razon_social} ({c.tipo})
                  </option>
                ))}
              </select>

              {!clienteSeleccionado && (
                <input
                  type="text"
                  placeholder="Nombre del cliente (opcional)"
                  value={clienteOcasional}
                  onChange={(e) => setClienteOcasional(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>

            {!clienteSeleccionado && (
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="minorista" checked={tipoCliente === 'minorista'}
                    onChange={() => setTipoCliente('minorista')} />
                  <span className="text-sm text-blue-600 font-medium">Minorista (por defecto)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="mayorista" checked={tipoCliente === 'mayorista'}
                    onChange={() => setTipoCliente('mayorista')} />
                  <span className="text-sm text-purple-600 font-medium">Mayorista (forzar en todo)</span>
                </label>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2">
              El precio se combina automáticamente: cada producto usa precio mayorista si su cantidad alcanza el mínimo configurado, sin importar los demás productos de la venta.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Buscar por marca..."
                value={busquedaMarca}
                onChange={(e) => setBusquedaMarca(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {productosFiltrados.map(p => (
                <div key={p.id_producto}
                  className="border border-gray-200 rounded-xl p-3 hover:border-green-400 hover:bg-green-50 transition"
                >
                  <p className="font-semibold text-gray-800 text-sm">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.categorias?.nombre || 'Sin categoría'}</p>
                  {p.marca && <p className="text-xs text-gray-400">Marca: {p.marca}</p>}
                  <div className="flex justify-between items-center mt-2 mb-1">
                    <span className="text-green-600 font-bold text-sm">S/ {getPrecioCatalogo(p)}</span>
                    <span className="text-xs text-gray-400">Total: {p.totalStock}</span>
                  </div>
                  {p.precio_mayorista && (
                    <p className="text-[11px] text-purple-500 mb-2">
                      Mayorista S/ {p.precio_mayorista} desde {p.cantidad_minima_mayorista || 6} uds.
                    </p>
                  )}
                  {p.stocks.filter(s => s.cantidad_actual > 0).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => agregarAlCarrito(p, s)}
                      className="w-full mb-1 bg-white border border-green-400 hover:bg-green-600 hover:text-white text-green-700 text-xs py-1.5 rounded-lg transition flex justify-between px-2"
                    >
                      <span>📦 {s.ubicaciones?.nombre}</span>
                      <span className="font-bold">+ {s.cantidad_actual} uds.</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow p-4 sticky top-4">
            <h3 className="font-bold text-gray-700 mb-1">🛒 Carrito</h3>
            <p className="text-xs text-gray-400 mb-4">{getNombreCliente()}</p>

            {carrito.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">El carrito está vacío</p>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {carrito.map(item => {
                    const cantidadTotal = totalCantidadItem(item)
                    const precio = precioUnitarioItem(item)
                    const esMayorista = item.precio_mayorista && precio === parseFloat(item.precio_mayorista)
                    return (
                      <div key={item.id_producto} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                            {item.marca && <p className="text-xs text-gray-400">Marca: {item.marca}</p>}
                          </div>
                          <button onClick={() => quitarProductoDelCarrito(item.id_producto)}
                            className="text-red-400 text-xs hover:text-red-600">Quitar</button>
                        </div>

                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${esMayorista ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {esMayorista ? `Mayorista (S/ ${precio})` : `Minorista (S/ ${precio})`}
                        </span>

                        <div className="mt-2 space-y-1.5">
                          {item.desglose.map(fila => (
                            <div key={fila.id_ubicacion} className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
                              <span className="text-[11px] text-gray-500 flex-1 truncate">📦 {fila.nombre_ubicacion}</span>
                              <button onClick={() => cambiarCantidadAlmacen(item.id_producto, fila.id_ubicacion, -6)}
                                className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">-6</button>
                              <button onClick={() => cambiarCantidadAlmacen(item.id_producto, fila.id_ubicacion, -1)}
                                className="w-5 h-5 bg-gray-200 rounded text-[10px] font-bold">-</button>
                              <span className="text-xs font-bold px-1">{fila.cantidad}</span>
                              <button onClick={() => cambiarCantidadAlmacen(item.id_producto, fila.id_ubicacion, 1)}
                                className="w-5 h-5 bg-gray-200 rounded text-[10px] font-bold">+</button>
                              <button onClick={() => cambiarCantidadAlmacen(item.id_producto, fila.id_ubicacion, 6)}
                                className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-[10px] font-bold">+6</button>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[11px] text-gray-400">{cantidadTotal} uds. en total</span>
                          <span className="text-sm text-green-600 font-bold">
                            S/ {(precio * cantidadTotal).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-700">Total:</span>
                    <span className="text-xl font-black text-green-600">S/ {calcularTotal()}</span>
                  </div>
                  <button
                    onClick={handleAbrirConfirmacion}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
                  >
                    ✅ Confirmar Venta
                  </button>
                  <button onClick={() => setCarrito([])}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-xl text-sm mt-2">
                    Limpiar carrito
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Ventas