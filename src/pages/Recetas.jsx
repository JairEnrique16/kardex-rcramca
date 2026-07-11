import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Recetas() {
  const [recetas, setRecetas] = useState([])
  const [productos, setProductos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [recetaAbierta, setRecetaAbierta] = useState(null)
  const [editando, setEditando] = useState(null)
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
      .select('*, productos(nombre), receta_insumos(id_receta_insumo, cantidad_necesaria, insumos(nombre, unidad_medida, id_insumo))')
      .order('id_receta')
    setRecetas(data || [])
    setLoading(false)
  }

  async function cargarProductos() {
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos(data || [])
  }

  async function cargarInsumos() {
    const { data } = await supabase.from('insumos').select('*').order('nombre')
    setInsumos(data || [])
  }

  function agregarInsumo() {
    setInsumosList([...insumosList, { id_insumo: '', cantidad_necesaria: '' }])
  }

  function eliminarInsumo(index) {
    if (insumosList.length === 1) return
    setInsumosList(insumosList.filter((_, i) => i !== index))
  }

  function actualizarInsumo(index, campo, valor) {
    const nuevaLista = [...insumosList]
    nuevaLista[index][campo] = valor
    setInsumosList(nuevaLista)
  }

  function handleEditar(r) {
    setEditando(r.id_receta)
    setForm({
      id_producto_terminado: r.id_producto_terminado?.toString() || '',
      descripcion_proceso: r.descripcion_proceso || '',
    })
    const insumosEditar = r.receta_insumos?.map(ri => ({
      id_insumo: ri.insumos?.id_insumo?.toString() || '',
      cantidad_necesaria: ri.cantidad_necesaria?.toString() || '',
    })) || [{ id_insumo: '', cantidad_necesaria: '' }]
    setInsumosList(insumosEditar)
    setShowForm(true)
    setRecetaAbierta(null)
    window.scrollTo(0, 0)
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

    if (editando) {
      // Actualizar receta existente
      const { data: updateData, error } = await supabase
        .from('recetas')
        .update({
          id_producto_terminado: parseInt(form.id_producto_terminado, 10),
          descripcion_proceso: form.descripcion_proceso,
        })
        .eq('id_receta', parseInt(editando, 10))
        .select()

      if (error) { alert('Error al actualizar: ' + error.message); return }

      if (!updateData || updateData.length === 0) {
        alert('No se actualizó ningún registro. Es probable que falte una policy de UPDATE en Supabase (RLS) para la tabla "recetas".')
        return
      }

      // Eliminar insumos anteriores y reinsertar
      const { error: delError } = await supabase
        .from('receta_insumos')
        .delete()
        .eq('id_receta', parseInt(editando, 10))

      if (delError) { alert('Error al eliminar insumos anteriores: ' + delError.message); return }

      const insumosData = insumosList.map(i => ({
        id_receta: parseInt(editando, 10),
        id_insumo: parseInt(i.id_insumo, 10),
        cantidad_necesaria: parseFloat(i.cantidad_necesaria),
      }))
      const { error: insError } = await supabase.from('receta_insumos').insert(insumosData)
      if (insError) { alert('Error al guardar insumos: ' + insError.message); return }

    } else {
      // Crear nueva receta
      const { data: receta, error } = await supabase
        .from('recetas')
        .insert({
          id_producto_terminado: parseInt(form.id_producto_terminado, 10),
          descripcion_proceso: form.descripcion_proceso,
        })
        .select()
        .single()

      if (error) { alert('Error: ' + error.message); return }

      const insumosData = insumosList.map(i => ({
        id_receta: receta.id_receta,
        id_insumo: parseInt(i.id_insumo, 10),
        cantidad_necesaria: parseFloat(i.cantidad_necesaria),
      }))
      const { error: insError } = await supabase.from('receta_insumos').insert(insumosData)
      if (insError) { alert('Error al guardar insumos: ' + insError.message); return }
    }

    setShowForm(false)
    setEditando(null)
    setForm({ id_producto_terminado: '', descripcion_proceso: '' })
    setInsumosList([{ id_insumo: '', cantidad_necesaria: '' }])
    cargarRecetas()
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta receta?')) return
    await supabase.from('receta_insumos').delete().eq('id_receta', id)
    await supabase.from('recetas').delete().eq('id_receta', id)
    if (recetaAbierta === id) setRecetaAbierta(null)
    cargarRecetas()
  }

  function toggleReceta(id) {
    setRecetaAbierta(recetaAbierta === id ? null : id)
  }

  function renderDescripcion(texto) {
    if (!texto) return null
    const lineas = texto.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim())
    if (lineas.length === 0) return null
    return (
      <ol className="list-decimal list-inside space-y-1.5">
        {lineas.map((linea, i) => (
          <li key={i} className="text-sm text-gray-600 leading-relaxed">{linea.trim()}</li>
        ))}
      </ol>
    )
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Recetas de Producción</h2>
        <button
          onClick={() => { setShowForm(true); setEditando(null); setForm({ id_producto_terminado: '', descripcion_proceso: '' }); setInsumosList([{ id_insumo: '', cantidad_necesaria: '' }]) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Nueva receta
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-green-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-lg">🧪</span>
            </div>
            <h3 className="text-md font-bold text-gray-700">
              {editando ? 'Editar Receta' : 'Nueva Receta de Producción'}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Producto terminado *</label>
              <select
                value={form.id_producto_terminado}
                onChange={(e) => setForm({ ...form, id_producto_terminado: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
              >
                <option value="">Seleccionar producto terminado</option>
                {productos.map(p => (
                  <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Pasos del proceso
                <span className="text-xs text-gray-400 ml-2">(cada línea será un paso de la lista)</span>
              </label>
              <textarea
                value={form.descripcion_proceso}
                onChange={(e) => setForm({ ...form, descripcion_proceso: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                rows="4"
                placeholder={`Mezclar aceites base\nAgregar esencias naturales\nVerter en moldes\nDejar reposar 24 horas`}
              />
              <p className="text-xs text-gray-400 mt-1">Escribe un paso por línea. Presiona Enter para el siguiente paso.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-600">
                  Insumos necesarios *
                  <span className="text-xs text-gray-400 ml-1">({insumosList.length} agregado{insumosList.length !== 1 ? 's' : ''})</span>
                </label>
                <button
                  onClick={agregarInsumo}
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-lg font-medium transition"
                >
                  + Agregar insumo
                </button>
              </div>

              <div className="space-y-2">
                {insumosList.map((ins, index) => (
                  <div key={index} className="flex gap-2 items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-xs font-bold">{index + 1}</span>
                    </div>
                    <select
                      value={ins.id_insumo}
                      onChange={(e) => actualizarInsumo(index, 'id_insumo', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">Seleccionar insumo</option>
                      {insumos.map(i => (
                        <option key={i.id_insumo} value={i.id_insumo}>
                          {i.nombre} ({i.unidad_medida}) — Stock: {i.stock_actual}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={ins.cantidad_necesaria}
                      onChange={(e) => actualizarInsumo(index, 'cantidad_necesaria', e.target.value)}
                      placeholder="Cant."
                      min="0"
                      step="0.01"
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    {insumosList.length > 1 && (
                      <button
                        onClick={() => eliminarInsumo(index)}
                        className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg flex items-center justify-center text-sm transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGuardar}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
              >
                {editando ? '✅ Actualizar receta' : '✅ Guardar receta'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditando(null); setInsumosList([{ id_insumo: '', cantidad_necesaria: '' }]) }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Cargando...</p>
        ) : recetas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <p className="text-4xl mb-3">🧪</p>
            <p className="text-gray-400 text-sm">No hay recetas registradas aún.</p>
          </div>
        ) : (
          recetas.map(r => (
            <div key={r.id_receta} className="bg-white rounded-2xl shadow overflow-hidden border border-gray-100">
              <div
                onClick={() => toggleReceta(r.id_receta)}
                className="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-gray-50 transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${recetaAbierta === r.id_receta ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <span className="text-sm">{recetaAbierta === r.id_receta ? '▼' : '▶'}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{r.productos?.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">Receta #{r.id_receta}</span>
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        {r.receta_insumos?.length || 0} insumo(s)
                      </span>
                      {r.descripcion_proceso && (
                        <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
                          {r.descripcion_proceso.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim()).length} paso(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditar(r) }}
                    className="text-blue-500 hover:text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEliminar(r.id_receta) }}
                    className="text-red-400 hover:text-red-600 text-xs px-3 py-1.5 rounded-lg border border-red-100 hover:border-red-300 hover:bg-red-50 transition"
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>

              {recetaAbierta === r.id_receta && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gradient-to-b from-gray-50 to-white">
                  {r.descripcion_proceso && (
                    <div className="mb-4 bg-white rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">📋 Pasos del proceso</p>
                      {renderDescripcion(r.descripcion_proceso)}
                    </div>
                  )}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🧱 Insumos necesarios</p>
                  <div className="grid grid-cols-2 gap-2">
                    {r.receta_insumos?.map((ri, i) => (
                      <div key={i} className="flex justify-between items-center bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{ri.insumos?.nombre}</p>
                          <p className="text-xs text-gray-400">{ri.insumos?.unidad_medida}</p>
                        </div>
                        <span className="text-sm font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                          {ri.cantidad_necesaria}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}

export default Recetas