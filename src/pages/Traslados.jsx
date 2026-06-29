import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Traslados() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [stockOrigen, setStockOrigen] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [form, setForm] = useState({
    id_producto: '',
    id_ubicacion_origen: '',
    id_ubicacion_destino: '',
    cantidad: '',
    observacion: '',
  })

  useEffect(() => {
    cargarProductos()
    cargarUbicaciones()
  }, [])

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
  }

  async function cargarUbicaciones() {
    const { data } = await supabase
      .from('ubicaciones')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setUbicaciones(data || [])
  }

  async function consultarStockOrigen(id_producto, id_ubicacion) {
    if (!id_producto || !id_ubicacion) return
    const { data } = await supabase
      .from('stock')
      .select('cantidad_actual')
      .eq('id_producto', parseInt(id_producto))
      .eq('id_ubicacion', parseInt(id_ubicacion))
      .single()
    setStockOrigen(data?.cantidad_actual || 0)
  }

  async function handleGuardar() {
    if (!form.id_producto || !form.id_ubicacion_origen || !form.id_ubicacion_destino || !form.cantidad) {
      alert('Todos los campos son obligatorios')
      return
    }
    if (form.id_ubicacion_origen === form.id_ubicacion_destino) {
      alert('El origen y destino no pueden ser el mismo')
      return
    }
    if (parseInt(form.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a cero')
      return
    }
    if (stockOrigen !== null && parseInt(form.cantidad) > stockOrigen) {
      alert('Stock insuficiente en el almacén origen. Disponible: ' + stockOrigen)
      return
    }

    setLoading(true)

    // Crear movimiento
    const { data: movimiento, error: movError } = await supabase
      .from('movimientos')
      .insert({
        tipo: 'traslado',
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

    // Crear detalle
    await supabase.from('detalle_movimientos').insert({
      id_movimiento: movimiento.id_movimiento,
      id_producto: parseInt(form.id_producto),
      id_ubicacion_origen: parseInt(form.id_ubicacion_origen),
      id_ubicacion_destino: parseInt(form.id_ubicacion_destino),
      cantidad: parseInt(form.cantidad),
    })

    // Descontar stock origen
    const { data: stockOri } = await supabase
      .from('stock')
      .select('*')
      .eq('id_producto', parseInt(form.id_producto))
      .eq('id_ubicacion', parseInt(form.id_ubicacion_origen))
      .single()

    if (stockOri) {
      await supabase
        .from('stock')
        .update({ cantidad_actual: stockOri.cantidad_actual - parseInt(form.cantidad) })
        .eq('id_stock', stockOri.id_stock)
    }

    // Aumentar stock destino
    const { data: stockDest } = await supabase
      .from('stock')
      .select('*')
      .eq('id_producto', parseInt(form.id_producto))
      .eq('id_ubicacion', parseInt(form.id_ubicacion_destino))
      .single()

    if (stockDest) {
      await supabase
        .from('stock')
        .update({ cantidad_actual: stockDest.cantidad_actual + parseInt(form.cantidad) })
        .eq('id_stock', stockDest.id_stock)
    } else {
      await supabase.from('stock').insert({
        id_producto: parseInt(form.id_producto),
        id_ubicacion: parseInt(form.id_ubicacion_destino),
        cantidad_actual: parseInt(form.cantidad),
      })
    }

    setLoading(false)
    setExito(true)
    setStockOrigen(null)
    setForm({ id_producto: '', id_ubicacion_origen: '', id_ubicacion_destino: '', cantidad: '', observacion: '' })
    setTimeout(() => setExito(false), 3000)
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Traslado entre Almacenes</h2>

      {exito && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          ✅ Traslado registrado correctamente. Stock actualizado en tiempo real.
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Producto *</label>
            <select
              value={form.id_producto}
              onChange={(e) => {
                setForm({ ...form, id_producto: e.target.value })
                consultarStockOrigen(e.target.value, form.id_ubicacion_origen)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Seleccionar producto</option>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Almacén origen *</label>
            <select
              value={form.id_ubicacion_origen}
              onChange={(e) => {
                setForm({ ...form, id_ubicacion_origen: e.target.value })
                consultarStockOrigen(form.id_producto, e.target.value)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Seleccionar origen</option>
              {ubicaciones.map(u => (
                <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre} ({u.tipo})</option>
              ))}
            </select>
          </div>

          {stockOrigen !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">Stock disponible en origen: <strong>{stockOrigen} unidades</strong></p>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">Almacén destino *</label>
            <select
              value={form.id_ubicacion_destino}
              onChange={(e) => setForm({ ...form, id_ubicacion_destino: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option value="">Seleccionar destino</option>
              {ubicaciones.map(u => (
                <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre} ({u.tipo})</option>
              ))}
            </select>
          </div>

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
              {loading ? 'Registrando...' : 'Confirmar Traslado'}
            </button>
            <button
              onClick={() => { setForm({ id_producto: '', id_ubicacion_origen: '', id_ubicacion_destino: '', cantidad: '', observacion: '' }); setStockOrigen(null) }}
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

export default Traslados