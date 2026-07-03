import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function Ingresos() {
  const { user } = useAuth()
  const [productos, setProductos] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [tipo, setTipo] = useState('ingreso_proveedor')
  const [observacion, setObservacion] = useState('')
  const [items, setItems] = useState([
    { id_producto: '', cantidad: '', id_ubicacion_destino: '' }
  ])

  useEffect(() => {
    cargarProductos()
    cargarUbicaciones()
  }, [])

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
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
    setItems([...items, { id_producto: '', cantidad: '', id_ubicacion_destino: '' }])
  }

  function eliminarItem(index) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function actualizarItem(index, campo, valor) {
    const nuevosItems = [...items]
    nuevosItems[index][campo] = valor
    setItems(nuevosItems)
  }

  async function handleGuardar() {
    if (items.some(i => !i.id_producto || !i.cantidad || !i.id_ubicacion_destino)) {
      alert('Completa todos los campos de cada producto')
      return
    }
    if (items.some(i => parseInt(i.cantidad) <= 0)) {
      alert('La cantidad debe ser mayor a cero')
      return
    }

    setLoading(true)

    // Crear movimiento
    const { data: movimiento, error: movError } = await supabase
      .from('movimientos')
      .insert({
        tipo,
        id_usuario: user.id,
        observacion,
      })
      .select()
      .single()

    if (movError) {
      alert('Error: ' + movError.message)
      setLoading(false)
      return
    }

    // Crear detalle y actualizar stock por cada producto
    for (const item of items) {
      await supabase.from('detalle_movimientos').insert({
        id_movimiento: movimiento.id_movimiento,
        id_producto: parseInt(item.id_producto),
        id_ubicacion_destino: parseInt(item.id_ubicacion_destino),
        cantidad: parseInt(item.cantidad),
      })

      const { data: stockExiste } = await supabase
        .from('stock')
        .select('*')
        .eq('id_producto', parseInt(item.id_producto))
        .eq('id_ubicacion', parseInt(item.id_ubicacion_destino))
        .single()

      if (stockExiste) {
        await supabase
          .from('stock')
          .update({ cantidad_actual: stockExiste.cantidad_actual + parseInt(item.cantidad) })
          .eq('id_stock', stockExiste.id_stock)
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
    setItems([{ id_producto: '', cantidad: '', id_ubicacion_destino: '' }])
    setObservacion('')
    setTimeout(() => setExito(false), 3000)
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-gray-700 mb-6">Registrar Ingreso de Mercadería</h2>

      {exito && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          ✅ Ingreso registrado correctamente. Stock actualizado en tiempo real.
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        {/* Tipo de ingreso */}
        <div className="mb-4">
          <label className="text-sm text-gray-600">Tipo de ingreso *</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
          >
            <option value="ingreso_proveedor">Ingreso de Proveedor</option>
            <option value="ingreso_produccion">Ingreso de Producción Propia</option>
          </select>
        </div>

        {/* Lista de productos */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-gray-700">Productos *</label>
            <button
              onClick={agregarItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs"
            >
              + Agregar producto
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const productoSel = productos.find(p => p.id_producto === parseInt(item.id_producto))
              return (
                <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-gray-500">Producto {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => eliminarItem(index)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        ✕ Quitar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Producto *</label>
                      <select
                        value={item.id_producto}
                        onChange={(e) => actualizarItem(index, 'id_producto', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                      >
                        <option value="">Seleccionar producto</option>
                        {productos.map(p => (
                          <option key={p.id_producto} value={p.id_producto}>
                            {p.nombre} {p.marca ? `(${p.marca})` : ''}
                          </option>
                        ))}
                      </select>
                      {productoSel?.marca && (
                        <p className="text-xs text-gray-400 mt-1">Marca: {productoSel.marca}</p>
                      )}
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
                    <div>
                      <label className="text-xs text-gray-500">Almacén destino *</label>
                      <select
                        value={item.id_ubicacion_destino}
                        onChange={(e) => actualizarItem(index, 'id_ubicacion_destino', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                      >
                        <option value="">Seleccionar almacén</option>
                        {ubicaciones.map(u => (
                          <option key={u.id_ubicacion} value={u.id_ubicacion}>
                            {u.nombre} ({u.tipo})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Observación */}
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
            {loading ? 'Registrando...' : 'Confirmar Ingreso'}
          </button>
          <button
            onClick={() => { setItems([{ id_producto: '', cantidad: '', id_ubicacion_destino: '' }]); setObservacion('') }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg text-sm"
          >
            Limpiar
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default Ingresos