import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Insumos() {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [ordenStock, setOrdenStock] = useState(false)
  const [items, setItems] = useState([{ nombre: '', unidad_medida: '', stock_actual: '' }])
  const [formEditar, setFormEditar] = useState({ nombre: '', unidad_medida: '', stock_actual: '' })

  useEffect(() => {
    cargarInsumos()
  }, [])

  async function cargarInsumos() {
    setLoading(true)
    const { data } = await supabase.from('insumos').select('*').order('nombre')
    setInsumos(data || [])
    setLoading(false)
  }

  function agregarItem() {
    setItems([...items, { nombre: '', unidad_medida: '', stock_actual: '' }])
  }

  function eliminarItem(index) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function actualizarItem(index, campo, valor) {
    const nuevos = [...items]
    nuevos[index][campo] = valor
    setItems(nuevos)
  }

  async function handleGuardar() {
    if (items.some(i => !i.nombre || !i.unidad_medida)) {
      alert('Nombre y unidad de medida son obligatorios en todos los insumos')
      return
    }

    for (const item of items) {
      const { error } = await supabase.from('insumos').insert({
        nombre: item.nombre,
        unidad_medida: item.unidad_medida,
        stock_actual: parseFloat(item.stock_actual) || 0,
      })
      if (error) { alert('Error: ' + error.message); return }
    }

    setShowForm(false)
    setItems([{ nombre: '', unidad_medida: '', stock_actual: '' }])
    cargarInsumos()
  }

  function handleEditar(insumo) {
    setEditando(insumo.id_insumo)
    setFormEditar({
      nombre: insumo.nombre,
      unidad_medida: insumo.unidad_medida,
      stock_actual: insumo.stock_actual,
    })
  }

  async function handleActualizar() {
    if (!formEditar.nombre || !formEditar.unidad_medida) {
      alert('Nombre y unidad de medida son obligatorios')
      return
    }
    const { error } = await supabase.from('insumos').update({
      nombre: formEditar.nombre,
      unidad_medida: formEditar.unidad_medida,
      stock_actual: parseFloat(formEditar.stock_actual) || 0,
    }).eq('id_insumo', editando)

    if (error) { alert('Error: ' + error.message); return }
    setEditando(null)
    cargarInsumos()
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este insumo?')) return
    await supabase.from('insumos').delete().eq('id_insumo', id)
    cargarInsumos()
  }

  let insumosFiltrados = insumos.filter(i =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (ordenStock) {
    insumosFiltrados = [...insumosFiltrados].sort((a, b) => a.stock_actual - b.stock_actual)
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Insumos</h2>
        <button
          onClick={() => { setShowForm(true); setEditando(null) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar insumos
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar insumo por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setOrdenStock(!ordenStock)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${ordenStock ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-300 text-gray-600'}`}
        >
          {ordenStock ? '📉 Menor stock primero' : '📊 Ordenar por stock'}
        </button>
      </div>

      {/* Formulario agregar múltiples */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-700">Nuevos Insumos</h3>
            <button onClick={agregarItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs">
              + Agregar otro
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-500">Insumo {index + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => eliminarItem(index)}
                      className="text-red-400 hover:text-red-600 text-xs">✕ Quitar</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Nombre *</label>
                    <input type="text" value={item.nombre}
                      onChange={(e) => actualizarItem(index, 'nombre', e.target.value)}
                      placeholder="Ej: Aceite de Coco"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Unidad *</label>
                    <input type="text" value={item.unidad_medida}
                      onChange={(e) => actualizarItem(index, 'unidad_medida', e.target.value)}
                      placeholder="Ej: Litro, Kg"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Stock inicial</label>
                    <input type="number" value={item.stock_actual}
                      onChange={(e) => actualizarItem(index, 'stock_actual', e.target.value)}
                      min="0" step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              Guardar todos
            </button>
            <button onClick={() => { setShowForm(false); setItems([{ nombre: '', unidad_medida: '', stock_actual: '' }]) }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">
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
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Stock actual</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : insumosFiltrados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay insumos registrados.</td></tr>
            ) : (
              insumosFiltrados.map(i => (
                <>
                  <tr key={i.id_insumo} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{i.id_insumo}</td>
                    <td className="px-4 py-3 font-medium">{i.nombre}</td>
                    <td className="px-4 py-3">{i.unidad_medida}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${i.stock_actual <= 5 ? 'text-red-500' : 'text-blue-600'}`}>
                        {i.stock_actual}
                      </span>
                      {i.stock_actual <= 5 && <span className="text-xs text-red-400 ml-1">⚠️ Bajo</span>}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEditar(i)}
                        className="text-blue-500 hover:text-blue-700 text-xs">Editar</button>
                      <button onClick={() => handleEliminar(i.id_insumo)}
                        className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                    </td>
                  </tr>
                  {editando === i.id_insumo && (
                    <tr key={`edit-${i.id_insumo}`} className="bg-blue-50">
                      <td colSpan="5" className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Nombre</label>
                            <input type="text" value={formEditar.nombre}
                              onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Unidad</label>
                            <input type="text" value={formEditar.unidad_medida}
                              onChange={(e) => setFormEditar({ ...formEditar, unidad_medida: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Stock actual</label>
                            <input type="number" value={formEditar.stock_actual}
                              onChange={(e) => setFormEditar({ ...formEditar, stock_actual: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={handleActualizar}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs">
                            Guardar
                          </button>
                          <button onClick={() => setEditando(null)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded-lg text-xs">
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default Insumos