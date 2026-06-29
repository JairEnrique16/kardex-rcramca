import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Insumos() {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    unidad_medida: '',
    stock_actual: '',
  })

  useEffect(() => {
    cargarInsumos()
  }, [])

  async function cargarInsumos() {
    setLoading(true)
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('nombre')
    setInsumos(data || [])
    setLoading(false)
  }

  async function handleGuardar() {
    if (!form.nombre || !form.unidad_medida) {
      alert('Nombre y unidad de medida son obligatorios')
      return
    }
    const { error } = await supabase.from('insumos').insert({
      nombre: form.nombre,
      unidad_medida: form.unidad_medida,
      stock_actual: parseFloat(form.stock_actual) || 0,
    })
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setForm({ nombre: '', unidad_medida: '', stock_actual: '' })
      cargarInsumos()
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este insumo?')) return
    await supabase.from('insumos').delete().eq('id_insumo', id)
    cargarInsumos()
  }

  const insumosFiltrados = insumos.filter(i =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Insumos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Agregar insumo
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar insumo por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nuevo Insumo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Aceite de Coco, Esencia de Lavanda"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Unidad de medida *</label>
              <input
                type="text"
                value={form.unidad_medida}
                onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                placeholder="Ej: Litro, Kg, Gramo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Stock inicial</label>
              <input
                type="number"
                value={form.stock_actual}
                onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleGuardar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Guardar
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
                <tr key={i.id_insumo} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{i.id_insumo}</td>
                  <td className="px-4 py-3 font-medium">{i.nombre}</td>
                  <td className="px-4 py-3">{i.unidad_medida}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{i.stock_actual}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEliminar(i.id_insumo)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Eliminar
                    </button>
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

export default Insumos