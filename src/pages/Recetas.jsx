import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Recetas() {
  const [recetas, setRecetas] = useState([])
  const [productos, setProductos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [insumosList, setInsumosList] = useState([{ id_insumo: '', cantidad_necesaria: '' }])
  const [form, setForm] = useState({
    id_producto_terminado: '',
    descripcion_proceso: '',
  })

  useEffect(() => {
    cargarRecetas()
    cargarProductos()
    cargarInsumos()
  }, [])

  async function cargarRecetas() {
    setLoading(true)
    const { data } = await supabase
      .from('recetas')
      .select('*, productos(nombre), receta_insumos(cantidad_necesaria, insumos(nombre, unidad_medida))')
      .order('id_receta')
    setRecetas(data || [])
    setLoading(false)
  }

  async function cargarProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setProductos(data || [])
  }

  async function cargarInsumos() {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('nombre')
    setInsumos(data || [])
  }

  function agregarInsumo() {
    setInsumosList([...insumosList, { id_insumo: '', cantidad_necesaria: '' }])
  }

  function eliminarInsumo(index) {
    setInsumosList(insumosList.filter((_, i) => i !== index))
  }

  function actualizarInsumo(index, campo, valor) {
    const nuevaLista = [...insumosList]
    nuevaLista[index][campo] = valor
    setInsumosList(nuevaLista)
  }

  async function handleGuardar() {
    if (!form.id_producto_terminado) {
      alert('Selecciona el producto terminado')
      return
    }
    if (insumosList.some(i => !i.id_insumo || !i.cantidad_necesaria)) {
      alert('Completa todos los insumos')
      return
    }

    const { data: receta, error } = await supabase
      .from('recetas')
      .insert({
        id_producto_terminado: parseInt(form.id_producto_terminado),
        descripcion_proceso: form.descripcion_proceso,
      })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    const insumosData = insumosList.map(i => ({
      id_receta: receta.id_receta,
      id_insumo: parseInt(i.id_insumo),
      cantidad_necesaria: parseFloat(i.cantidad_necesaria),
    }))

    const { error: insError } = await supabase.from('receta_insumos').insert(insumosData)
    if (insError) {
      alert('Error al guardar insumos: ' + insError.message)
      return
    }

    setShowForm(false)
    setForm({ id_producto_terminado: '', descripcion_proceso: '' })
    setInsumosList([{ id_insumo: '', cantidad_necesaria: '' }])
    cargarRecetas()
  }
    async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta receta?')) return
    await supabase.from('receta_insumos').delete().eq('id_receta', id)
    await supabase.from('recetas').delete().eq('id_receta', id)
    cargarRecetas()
  }
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Recetas de Producción</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Nueva receta
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Nueva Receta</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Producto terminado *</label>
              <select
                value={form.id_producto_terminado}
                onChange={(e) => setForm({ ...form, id_producto_terminado: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="">Seleccionar producto</option>
                {productos.map(p => (
                  <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Descripción del proceso</label>
              <textarea
                value={form.descripcion_proceso}
                onChange={(e) => setForm({ ...form, descripcion_proceso: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                rows="2"
                placeholder="Describe el proceso de elaboración"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-600 font-medium">Insumos necesarios *</label>
                <button
                  onClick={agregarInsumo}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  + Agregar insumo
                </button>
              </div>
              {insumosList.map((ins, index) => (
                <div key={index} className="flex gap-3 mb-2">
                  <select
                    value={ins.id_insumo}
                    onChange={(e) => actualizarInsumo(index, 'id_insumo', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar insumo</option>
                    {insumos.map(i => (
                      <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.unidad_medida})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={ins.cantidad_necesaria}
                    onChange={(e) => actualizarInsumo(index, 'cantidad_necesaria', e.target.value)}
                    placeholder="Cantidad"
                    min="0"
                    step="0.01"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {insumosList.length > 1 && (
                    <button
                      onClick={() => eliminarInsumo(index)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGuardar}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Guardar receta
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Cargando...</p>
        ) : recetas.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No hay recetas registradas.</p>
        ) : (
          recetas.map(r => (
            <div key={r.id_receta} className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-800">{r.productos?.nombre}</h3>
              {r.descripcion_proceso && (
                <p className="text-xs text-gray-500 mt-1">{r.descripcion_proceso}</p>
              )}
              <div className="mt-3">
                <p className="text-xs text-gray-600 font-medium mb-1">Insumos:</p>
                {r.receta_insumos?.map((ri, i) => (
                  <span key={i} className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mr-2 mb-1">
                    {ri.insumos?.nombre}: {ri.cantidad_necesaria} {ri.insumos?.unidad_medida}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleEliminar(r.id_receta)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Eliminar receta
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}

export default Recetas