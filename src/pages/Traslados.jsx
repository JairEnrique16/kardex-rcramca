import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Traslados() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [items, setItems] = useState([
    { id_producto: '', id_ubicacion_origen: '', id_ubicacion_destino: '', cantidad: '', stockDisponible: null }
  ])

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

  function agregarItem() {
    setItems([...items, { id_producto: '', id_ubicacion_origen: '', id_ubicacion_destino: '', cantidad: '', stockDisponible: null }])
  }

  function eliminarItem(index) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  async function actualizarItem(index, campo, valor) {
    const nuevosItems = [...items]
    nuevosItems[index][campo] = valor

    if (campo === 'id_producto' || campo === 'id_ubicacion_origen') {
      const id_producto = campo === 'id_producto' ? valor : nuevosItems[index].id_producto
      const id_ubicacion = campo === 'id_ubicacion_origen' ? valor : nuevosItems[index].id_ubicacion_origen

      if (id_producto && id_ubicacion) {
        const { data } = await supabase
          .from('stock')
          .select('cantidad_actual')
          .eq('id_producto', parseInt(id_producto))
          .eq('id_ubicacion', parseInt(id_ubicacion))
          .single()
        nuevosItems[index].stockDisponible = data?.cantidad_actual || 0
      }
    }

    setItems(nuevosItems)
  }

  async function handleGuardar() {
    if (items.some(i => !i.id_producto || !i.id_ubicacion_origen || !i.id_ubicacion_destino || !i.cantidad)) {
      alert('Completa todos los campos de cada traslado')
      return
    }
    if (items.some(i => i.id_ubicacion_origen === i.id_ubicacion_destino)) {
      alert('El origen y destino no pueden ser iguales')
      return
    }
    if (items.some(i => parseInt(i.cantidad) <= 0)) {
      alert('La cantidad debe ser mayor a cero')
      return
    }
    for (const item of items) {
      if (item.stockDisponible !== null && parseInt(item.cantidad) > item.stockDisponible) {
        const prod = productos.find(p => p.id_producto === parseInt(item.id_producto))
        alert(`Stock insuficiente para ${prod?.nombre}. Disponible: ${item.stockDisponible}`)
        return
      }
    }

    setLoading(true)

    const { data: movimiento, error } = await supabase
      .from('movimientos')
      .insert({
        tipo: 'traslado',
        id_usuario: user.id,
        observacion,
      })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    for (const item of items) {
      await supabase.from('detalle_movimientos').insert({
        id_movimiento: movimiento.id_movimiento,
        id_producto: parseInt(item.id_producto),
        id_ubicacion_origen: parseInt(item.id_ubicacion_origen),
        id_ubicacion_destino: parseInt(item.id_ubicacion_destino),
        cantidad: parseInt(item.cantidad),
      })

      // Descontar origen
      const { data: stockOri } = await supabase
        .from('stock')
        .select('*')
        .eq('id_producto', parseInt(item.id_producto))
        .eq('id_ubicacion', parseInt(item.id_ubicacion_origen))
        .single()

      if (stockOri) {
        await supabase.from('stock')
          .update({ cantidad_actual: stockOri.cantidad_actual - parseInt(item.cantidad) })
          .eq('id_stock', stockOri.id_stock)
      }

      // Aumentar destino
      const { data: stockDest } = await supabase
        .from('stock')
        .select('*')
        .eq('id_producto', parseInt(item.id_producto))
        .eq('id_ubicacion', parseInt(item.id_ubicacion_destino))
        .single()

      if (stockDest) {
        await supabase.from('stock')
          .update({ cantidad_actual: stockDest.cantidad_actual + parseInt(item.cantidad) })
          .eq('id_stock', stockDest.id_stock)
      } else {
        await supabase.from('stock').insert({
          id_producto: parseInt(item.id_producto),
          id_ubicacion: parseInt(item.id_ubicacion_destino),
          cantidad_actual: parseInt(item.cantidad),
        })
      }
    }

    setLoading(false)
    setExito(true)
    setItems([{ id_producto: '', id_ubicacion_origen: '', id_ubicacion_destino: '', cantidad: '', stockDisponible: null }])
    setObservacion('')
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

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-gray-700">Productos a trasladar *</label>
          <button
            onClick={agregarItem}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs"
          >
            + Agregar producto
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-gray-500">Traslado {index + 1}</span>
                {items.length > 1 && (
                  <button
                    onClick={() => eliminarItem(index)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕ Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Producto *</label>
                  <select
                    value={item.id_producto}
                    onChange={(e) => actualizarItem(index, 'id_producto', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    <option value="">Seleccionar</option>
                    {productos.map(p => (
                      <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Origen *</label>
                  <select
                    value={item.id_ubicacion_origen}
                    onChange={(e) => actualizarItem(index, 'id_ubicacion_origen', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    <option value="">Seleccionar</option>
                    {ubicaciones.map(u => (
                      <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre}</option>
                    ))}
                  </select>
                  {item.stockDisponible !== null && (
                    <p className="text-xs text-blue-600 mt-1">Stock: {item.stockDisponible}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Destino *</label>
                  <select
                    value={item.id_ubicacion_destino}
                    onChange={(e) => actualizarItem(index, 'id_ubicacion_destino', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    <option value="">Seleccionar</option>
                    {ubicaciones.map(u => (
                      <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cantidad *</label>
                  <input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="text-sm text-gray-600">Observación (opcional)</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            rows="2"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGuardar}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Confirmar Traslado'}
          </button>
          <button
            onClick={() => { setItems([{ id_producto: '', id_ubicacion_origen: '', id_ubicacion_destino: '', cantidad: '', stockDisponible: null }]); setObservacion('') }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg text-sm"
          >
            Limpiar
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default Traslados