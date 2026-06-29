import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Salidas() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [stockDisponible, setStockDisponible] = useState(null)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [form, setForm] = useState({
    id_producto: '',
    cantidad: '',
    observacion: '',
  })

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
  }

  async function consultarStock(id_producto) {
    if (!id_producto) return
    const { data } = await supabase
      .from('stock')
      .select('*, ubicaciones(nombre, tipo)')
      .eq('id_producto', parseInt(id_producto))
      .gt('cantidad_actual', 0)
    setStockDisponible(data || [])
    setUbicacionSeleccionada('')
  }

  async function handleProductoChange(e) {
    const id = e.target.value
    setForm({ ...form, id_producto: id })
    await consultarStock(id)
  }

  async function handleGuardar() {
    if (!form.id_producto || !form.cantidad || !ubicacionSeleccionada) {
      alert('Producto, almacén de origen y cantidad son obligatorios')
      return
    }
    if (parseInt(form.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a cero')
      return
    }

    const stockUbicacion = stockDisponible?.find(s => s.id_ubicacion === parseInt(ubicacionSeleccionada))
    if (!stockUbicacion || parseInt(form.cantidad) > stockUbicacion.cantidad_actual) {
      alert('Stock insuficiente en el almacén seleccionado. Disponible: ' + (stockUbicacion?.cantidad_actual || 0))
      return
    }

    setLoading(true)

    // Crear movimiento
    const { data: movimiento, error: movError } = await supabase
      .from('movimientos')
      .insert({
        tipo: 'salida_venta',
        id_usuario: user.id,
        observacion: form.observacion,
      })
      .select()
      .single()

    if (movError) {
      alert('Error: ' + movError.message)
      setLoading(false)
      return
    }

    // Crear detalle con ubicacion origen
    await supabase.from('detalle_movimientos').insert({
      id_movimiento: movimiento.id_movimiento,
      id_producto: parseInt(form.id_producto),
      id_ubicacion_origen: parseInt(ubicacionSeleccionada),
      cantidad: parseInt(form.cantidad),
    })

    // Descontar stock del almacén seleccionado
    await supabase
      .from('stock')
      .update({ cantidad_actual: stockUbicacion.cantidad_actual - parseInt(form.cantidad) })
      .eq('id_stock', stockUbicacion.id_stock)

    setLoading(false)
    setExito(true)
    setStockDisponible(null)
    setUbicacionSeleccionada('')
    setForm({ id_producto: '', cantidad: '', observacion: '' })
    setTimeout(() => setExito(false), 3000)
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Registrar Salida por Venta</h2>

      {exito && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          ✅ Salida registrada correctamente. Stock actualizado en tiempo real.
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Producto *</label>
            <select
              value={form.id_producto}
              onChange={handleProductoChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Buscar y seleccionar producto</option>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {stockDisponible !== null && stockDisponible.length > 0 && (
            <div>
              <label className="text-sm text-gray-600">Almacén de origen *</label>
              <select
                value={ubicacionSeleccionada}
                onChange={(e) => setUbicacionSeleccionada(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar almacén</option>
                {stockDisponible.map((s, i) => (
                  <option key={i} value={s.id_ubicacion}>
                    {s.ubicaciones?.nombre} ({s.ubicaciones?.tipo}) — Stock: {s.cantidad_actual} uds.
                  </option>
                ))}
              </select>
            </div>
          )}

          {stockDisponible !== null && stockDisponible.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">Sin stock disponible para este producto.</p>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">Cantidad *</label>
            <input
              type="number"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Observación (opcional)</label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              rows="2"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleGuardar}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Confirmar Salida'}
            </button>
            <button
              onClick={() => { setForm({ id_producto: '', cantidad: '', observacion: '' }); setStockDisponible(null); setUbicacionSeleccionada('') }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Salidas