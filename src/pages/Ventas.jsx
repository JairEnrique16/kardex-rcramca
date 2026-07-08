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

  function getPrecio(producto) {
    const esMayorista = clienteSeleccionado?.tipo === 'mayorista' || tipoCliente === 'mayorista'
    if (esMayorista && producto.precio_mayorista) {
      return parseFloat(producto.precio_mayorista)
    }
    return parseFloat(producto.precio_minorista || producto.precio_referencia || 0)
  }

  function agregarAlCarrito(producto, stockSeleccionado) {
    const keyCarrito = `${producto.id_producto}-${stockSeleccionado.id_ubicacion}`
    const existe = carrito.find(c => c.keyCarrito === keyCarrito)

    if (existe) {
      if (existe.cantidad >= stockSeleccionado.cantidad_actual) {
        alert('No hay suficiente stock en este almacén')
        return
      }
      setCarrito(carrito.map(c =>
        c.keyCarrito === keyCarrito
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ))
    } else {
      setCarrito([...carrito, {
        keyCarrito,
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        marca: producto.marca || '',
        precio: getPrecio(producto),
        cantidad: 1,
        totalStock: stockSeleccionado.cantidad_actual,
        id_ubicacion: stockSeleccionado.id_ubicacion,
        nombre_ubicacion: stockSeleccionado.ubicaciones?.nombre,
        stocks: producto.stocks,
        unidad_medida: producto.unidad_medida,
      }])
    }
  }

  function quitarDelCarrito(keyCarrito) {
    setCarrito(carrito.filter(c => c.keyCarrito !== keyCarrito))
  }

  function cambiarCantidad(keyCarrito, cantidad) {
    if (cantidad < 1) return
    const item = carrito.find(c => c.keyCarrito === keyCarrito)
    if (cantidad > item.totalStock) {
      alert('Stock insuficiente en este almacén. Disponible: ' + item.totalStock)
      return
    }
    setCarrito(carrito.map(c =>
      c.keyCarrito === keyCarrito ? { ...c, cantidad } : c
    ))
  }

  function calcularTotal() {
    return carrito.reduce((sum, c) => sum + (c.precio * c.cantidad), 0).toFixed(2)
  }

  function getNombreCliente() {
    if (clienteSeleccionado) return clienteSeleccionado.nombre_razon_social
    if (clienteOcasional.trim()) return clienteOcasional.trim()
    return 'Cliente ocasional'
  }

  async function handleConfirmarVenta() {
    if (carrito.length === 0) {
      alert('El carrito está vacío')
      return
    }
    setLoading(true)

    const { data: venta, error: ventaError } = await supabase
      .from('ventas_cabecera')
      .insert({
        id_cliente: clienteSeleccionado?.id_cliente || null,
        total_venta: parseFloat(calcularTotal()),
        id_usuario: user.id,
      })
      .select()
      .single()

    if (ventaError) {
      alert('Error: ' + ventaError.message)
      setLoading(false)
      return
    }

    for (const item of carrito) {
      await supabase.from('ventas_detalle').insert({
        id_venta: venta.id_venta,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_aplicado: item.precio,
        subtotal: item.precio * item.cantidad,
      })

      const { data: movimiento } = await supabase
        .from('movimientos')
        .insert({
          tipo: 'salida_venta',
          id_usuario: user.id,
          observacion: `Venta #${venta.id_venta} - ${getNombreCliente()}`,
        })
        .select()
        .single()

      // Descontar stock del almacén específico seleccionado
      const stockActual = item.stocks.find(s => s.id_ubicacion === item.id_ubicacion)
      if (stockActual) {
        await supabase
          .from('stock')
          .update({ cantidad_actual: stockActual.cantidad_actual - item.cantidad })
          .eq('id_stock', stockActual.id_stock)
      }

      await supabase.from('detalle_movimientos').insert({
        id_movimiento: movimiento.id_movimiento,
        id_producto: item.id_producto,
        id_ubicacion_origen: item.id_ubicacion,
        cantidad: item.cantidad,
      })
    }

    setVentaRegistrada({
      ...venta,
      items: [...carrito],
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
                      S/ {(item.precio * item.cantidad).toFixed(2)}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {item.cantidad} x S/ {item.precio} — 📦 {item.nombre_ubicacion}
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
                  setCarrito([])
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
                    onChange={() => { setTipoCliente('minorista'); setCarrito([]) }} />
                  <span className="text-sm text-blue-600 font-medium">Minorista</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="mayorista" checked={tipoCliente === 'mayorista'}
                    onChange={() => { setTipoCliente('mayorista'); setCarrito([]) }} />
                  <span className="text-sm text-purple-600 font-medium">Mayorista</span>
                </label>
              </div>
            )}

            {clienteSeleccionado && (
              <p className="text-xs text-blue-600 mt-1">
                {clienteSeleccionado.tipo === 'mayorista' ? '🏷️ Precio mayorista' : '🏷️ Precio minorista'}
              </p>
            )}
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
                  <div className="flex justify-between items-center mt-2 mb-2">
                    <span className="text-green-600 font-bold text-sm">S/ {getPrecio(p)}</span>
                    <span className="text-xs text-gray-400">Total: {p.totalStock}</span>
                  </div>
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
                <div className="space-y-3 max-h-72 overflow-y-auto mb-4">
                  {carrito.map(item => (
                    <div key={item.keyCarrito} className="border border-gray-100 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                      {item.marca && <p className="text-xs text-gray-400">Marca: {item.marca}</p>}
                      <p className="text-xs text-blue-500">📦 {item.nombre_ubicacion}</p>
                      <p className="text-xs text-gray-500">S/ {item.precio} c/u</p>
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <button onClick={() => cambiarCantidad(item.keyCarrito, item.cantidad - 12)}
                          className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">-12</button>
                        <button onClick={() => cambiarCantidad(item.keyCarrito, item.cantidad - 6)}
                          className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">-6</button>
                        <button onClick={() => cambiarCantidad(item.keyCarrito, item.cantidad - 1)}
                          className="w-6 h-6 bg-gray-200 rounded text-xs font-bold">-</button>
                        <span className="text-sm font-bold px-1">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.keyCarrito, item.cantidad + 1)}
                          className="w-6 h-6 bg-gray-200 rounded text-xs font-bold">+</button>
                        <button onClick={() => cambiarCantidad(item.keyCarrito, item.cantidad + 6)}
                          className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs font-bold">+6</button>
                        <button onClick={() => cambiarCantidad(item.keyCarrito, item.cantidad + 12)}
                          className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs font-bold">+12</button>
                        <span className="text-sm text-green-600 font-bold ml-auto">
                          S/ {(item.precio * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                      <button onClick={() => quitarDelCarrito(item.keyCarrito)}
                        className="text-red-400 text-xs mt-1 hover:text-red-600">Quitar</button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-700">Total:</span>
                    <span className="text-xl font-black text-green-600">S/ {calcularTotal()}</span>
                  </div>
                  <button
                    onClick={handleConfirmarVenta}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
                  >
                    {loading ? 'Procesando...' : '✅ Confirmar Venta'}
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