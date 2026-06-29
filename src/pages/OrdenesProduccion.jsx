import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function OrdenesProduccion() {
  const { user } = useAuth()
  const [ordenes, setOrdenes] = useState([])
  const [recetas, setRecetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    id_receta: '',
    fecha_planificada: '',
    cantidad_lotes: 1,
  })

  useEffect(() => {
    cargarOrdenes()
    cargarRecetas()
  }, [])

  async function cargarOrdenes() {
    setLoading(true)
    const { data } = await supabase
      .from('ordenes_produccion')
      .select('*, recetas(descripcion_proceso, productos(nombre))')
      .order('id_orden', { ascending: false })
    setOrdenes(data || [])
    setLoading(false)
  }

  async function cargarRecetas() {
    const { data } = await supabase
      .from('recetas')
      .select('*, productos(nombre)')
      .order('id_receta')
    setRecetas(data || [])
  }

  async function handleGuardar() {
    if (!form.id_receta || !form.fecha_planificada) {
      alert('Receta y fecha son obligatorios')
      return
    }
    const { error } = await supabase.from('ordenes_produccion').insert({
      id_receta: parseInt(form.id_receta),
      fecha_planificada: form.fecha_planificada,
      estado: 'pendiente',
      id_responsable: user.id,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setForm({ id_receta: '', fecha_planificada: '', cantidad_lotes: 1 })
      cargarOrdenes()
    }
  }

  async function handleCambiarEstado(orden) {
    if (orden.estado === 'pendiente') {
      await supabase.from('ordenes_produccion').update({ estado: 'proceso' }).eq('id_orden', orden.id_orden)
      cargarOrdenes()
    } else if (orden.estado === 'proceso') {
      if (!confirm('¿Marcar como terminada? El sistema descontará los insumos y aumentará el stock del producto.')) return
      await finalizarOrden(orden)
    }
  }

  async function finalizarOrden(orden) {
    // Obtener receta con insumos
    const { data: receta } = await supabase
      .from('recetas')
      .select('*, receta_insumos(cantidad_necesaria, id_insumo), productos(nombre)')
      .eq('id_receta', orden.id_receta)
      .single()

    if (!receta) {
      alert('No se encontró la receta')
      return
    }

    // Verificar y descontar insumos
    for (const ri of receta.receta_insumos) {
      const { data: insumo } = await supabase
        .from('insumos')
        .select('*')
        .eq('id_insumo', ri.id_insumo)
        .single()

      if (!insumo || insumo.stock_actual < ri.cantidad_necesaria) {
        alert(`Insumo insuficiente: ${insumo?.nombre || 'desconocido'}. Disponible: ${insumo?.stock_actual || 0}`)
        return
      }

      await supabase
        .from('insumos')
        .update({ stock_actual: insumo.stock_actual - ri.cantidad_necesaria })
        .eq('id_insumo', ri.id_insumo)
    }

    // Registrar movimiento de producción propia
    const { data: movimiento } = await supabase
      .from('movimientos')
      .insert({
        tipo: 'ingreso_produccion',
        id_usuario: user.id,
        observacion: `Orden de producción #${orden.id_orden} - ${receta.productos?.nombre}`,
      })
      .select()
      .single()

    // Actualizar stock del producto terminado en Almacén Principal
    const { data: stockExiste } = await supabase
      .from('stock')
      .select('*')
      .eq('id_producto', receta.id_producto_terminado)
      .eq('id_ubicacion', 1)
      .single()

    if (stockExiste) {
      await supabase
        .from('stock')
        .update({ cantidad_actual: stockExiste.cantidad_actual + 1 })
        .eq('id_stock', stockExiste.id_stock)
    } else {
      await supabase.from('stock').insert({
        id_producto: receta.id_producto_terminado,
        id_ubicacion: 1,
        cantidad_actual: 1,
      })
    }

    // Marcar orden como terminada
    await supabase
      .from('ordenes_produccion')
      .update({ estado: 'terminado' })
      .eq('id_orden', orden.id_orden)

    alert('✅ Orden finalizada. Stock actualizado correctamente.')
    cargarOrdenes()
  }

  function colorEstado(estado) {
    if (estado === 'terminado') return 'bg-green-100 text-green-700'
    if (estado === 'proceso') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Órdenes de Producción</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Nueva orden
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nueva Orden de Producción</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Receta *</label>
              <select
                value={form.id_receta}
                onChange={(e) => setForm({ ...form, id_receta: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar receta</option>
                {recetas.map(r => (
                  <option key={r.id_receta} value={r.id_receta}>
                    {r.productos?.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Fecha planificada *</label>
              <input
                type="date"
                value={form.fecha_planificada}
                onChange={(e) => setForm({ ...form, fecha_planificada: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Crear orden
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Fecha planificada</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : ordenes.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay órdenes registradas.</td></tr>
            ) : (
              ordenes.map(o => (
                <tr key={o.id_orden} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{o.id_orden}</td>
                  <td className="px-4 py-3 font-medium">{o.recetas?.productos?.nombre}</td>
                  <td className="px-4 py-3">{new Date(o.fecha_planificada).toLocaleDateString('es-PE')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${colorEstado(o.estado)}`}>
                      {o.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.estado === 'pendiente' && (
                      <button
                        onClick={() => handleCambiarEstado(o)}
                        className="text-yellow-600 hover:text-yellow-800 text-xs mr-2"
                      >
                        Iniciar
                      </button>
                    )}
                    {o.estado === 'proceso' && (
                      <button
                        onClick={() => handleCambiarEstado(o)}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        Marcar terminada
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default OrdenesProduccion