import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

function OrdenesProduccion() {
  const { user } = useAuth()
  const [ordenes, setOrdenes] = useState([])
  const [recetas, setRecetas] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [modo, setModo] = useState('receta') // 'receta' | 'producto'
  const [form, setForm] = useState({
    id_receta: '',
    id_producto: '',
    fecha_planificada: '',
    cantidad: 1,
  })
  const [filtros, setFiltros] = useState({
    nombre: '',
    marca: '',
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
  })

  useEffect(() => {
    cargarOrdenes()
    cargarRecetas()
    cargarProductos()
  }, [])

  async function cargarOrdenes() {
    setLoading(true)
    const { data } = await supabase
      .from('ordenes_produccion')
      .select('*, recetas(descripcion_proceso, productos(nombre, marca)), producto_directo:id_producto(nombre, marca)')
      .order('id_orden', { ascending: false })
      .limit(500)
    setOrdenes(data || [])
    setLoading(false)
  }

  async function cargarRecetas() {
    const { data } = await supabase
      .from('recetas')
      .select('*, productos(nombre, marca)')
      .order('id_receta')
    setRecetas(data || [])
  }

  async function cargarProductos() {
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos(data || [])
  }

  function infoProducto(o) {
    if (o.recetas?.productos) return o.recetas.productos
    return o.producto_directo || {}
  }

  function cerrarForm() {
    setShowForm(false)
    setEditando(null)
    setModo('receta')
    setForm({ id_receta: '', id_producto: '', fecha_planificada: '', cantidad: 1 })
  }

  function handleEditar(o) {
    setEditando(o.id_orden)
    setModo(o.id_receta ? 'receta' : 'producto')
    setForm({
      id_receta: o.id_receta?.toString() || '',
      id_producto: o.id_producto?.toString() || '',
      fecha_planificada: o.fecha_planificada?.slice(0, 10) || '',
      cantidad: o.cantidad || 1,
    })
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  async function handleGuardar() {
    if (modo === 'receta' && !form.id_receta) {
      alert('Selecciona una receta')
      return
    }
    if (modo === 'producto' && !form.id_producto) {
      alert('Selecciona un producto')
      return
    }
    if (!form.fecha_planificada) {
      alert('La fecha planificada es obligatoria')
      return
    }
    if (!form.cantidad || form.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0')
      return
    }

    const payload = {
      id_receta: modo === 'receta' ? parseInt(form.id_receta, 10) : null,
      id_producto: modo === 'producto' ? parseInt(form.id_producto, 10) : null,
      fecha_planificada: form.fecha_planificada,
      cantidad: parseInt(form.cantidad, 10),
    }

    if (editando) {
      const { error } = await supabase
        .from('ordenes_produccion')
        .update(payload)
        .eq('id_orden', editando)
      if (error) { alert('Error al actualizar: ' + error.message); return }
    } else {
      const { error } = await supabase.from('ordenes_produccion').insert({
        ...payload,
        estado: 'pendiente',
        id_responsable: user.id,
      })
      if (error) { alert('Error: ' + error.message); return }
    }

    cerrarForm()
    cargarOrdenes()
  }

  async function handleEliminar(o) {
    if (!confirm('¿Eliminar esta orden de producción?')) return
    const { error } = await supabase.from('ordenes_produccion').delete().eq('id_orden', o.id_orden)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    cargarOrdenes()
  }

  async function handleCambiarEstado(orden) {
    if (orden.estado === 'pendiente') {
      await supabase.from('ordenes_produccion').update({ estado: 'proceso' }).eq('id_orden', orden.id_orden)
      cargarOrdenes()
    } else if (orden.estado === 'proceso') {
      if (!confirm('¿Marcar como terminada? El sistema actualizará el stock (y descontará insumos si la orden tiene receta).')) return
      await finalizarOrden(orden)
    }
  }

  async function registrarIngreso(idProducto, cantidad, nombreProducto, idOrden) {
    await supabase.from('movimientos').insert({
      tipo: 'ingreso_produccion',
      id_usuario: user.id,
      observacion: `Orden de producción #${idOrden} - ${nombreProducto} (x${cantidad})`,
    })

    const { data: stockExiste } = await supabase
      .from('stock')
      .select('*')
      .eq('id_producto', idProducto)
      .eq('id_ubicacion', 1)
      .single()

    if (stockExiste) {
      await supabase
        .from('stock')
        .update({ cantidad_actual: stockExiste.cantidad_actual + cantidad })
        .eq('id_stock', stockExiste.id_stock)
    } else {
      await supabase.from('stock').insert({
        id_producto: idProducto,
        id_ubicacion: 1,
        cantidad_actual: cantidad,
      })
    }
  }

  async function finalizarOrden(orden) {
    const cantidad = orden.cantidad || 1

    if (orden.id_receta) {
      // Camino CON receta: verificar y descontar insumos
      const { data: receta } = await supabase
        .from('recetas')
        .select('*, receta_insumos(cantidad_necesaria, id_insumo, insumos(nombre)), productos(nombre)')
        .eq('id_receta', orden.id_receta)
        .single()

      if (!receta) {
        alert('No se encontró la receta')
        return
      }

      // Verificar TODOS los insumos antes de descontar cualquiera
      const requerimientos = []
      for (const ri of receta.receta_insumos) {
        const necesario = ri.cantidad_necesaria * cantidad
        const { data: insumo } = await supabase
          .from('insumos')
          .select('*')
          .eq('id_insumo', ri.id_insumo)
          .single()

        if (!insumo || insumo.stock_actual < necesario) {
          alert(`Insumo insuficiente: ${insumo?.nombre || ri.insumos?.nombre || 'desconocido'}. Necesario: ${necesario}, disponible: ${insumo?.stock_actual || 0}`)
          return
        }
        requerimientos.push({ insumo, necesario })
      }

      for (const { insumo, necesario } of requerimientos) {
        await supabase
          .from('insumos')
          .update({ stock_actual: insumo.stock_actual - necesario })
          .eq('id_insumo', insumo.id_insumo)
      }

      await registrarIngreso(receta.id_producto_terminado, cantidad, receta.productos?.nombre, orden.id_orden)
    } else {
      // Camino SIN receta: solo ensamblaje, no se descuentan insumos
      await registrarIngreso(orden.id_producto, cantidad, orden.producto_directo?.nombre, orden.id_orden)
    }

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

  const ordenesFiltradas = ordenes.filter(o => {
    const info = infoProducto(o)
    const nombre = (info.nombre || '').toLowerCase()
    const marca = (info.marca || '').toLowerCase()

    if (filtros.nombre && !nombre.includes(filtros.nombre.toLowerCase())) return false
    if (filtros.marca && !marca.includes(filtros.marca.toLowerCase())) return false
    if (filtros.estado && o.estado !== filtros.estado) return false
    if (filtros.fechaDesde && o.fecha_planificada < filtros.fechaDesde) return false
    if (filtros.fechaHasta && o.fecha_planificada > filtros.fechaHasta) return false
    return true
  })

  const hayFiltrosActivos = Object.values(filtros).some(v => v)
  const ordenesAMostrar = hayFiltrosActivos ? ordenesFiltradas : ordenesFiltradas.slice(0, 20)

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
          <h3 className="text-md font-semibold text-gray-700 mb-4">
            {editando ? 'Editar Orden de Producción' : 'Nueva Orden de Producción'}
          </h3>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setModo('receta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${modo === 'receta' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Con receta
            </button>
            <button
              type="button"
              onClick={() => setModo('producto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${modo === 'producto' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Sin receta (producto directo)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {modo === 'receta' ? (
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
            ) : (
              <div>
                <label className="text-sm text-gray-600">Producto *</label>
                <select
                  value={form.id_producto}
                  onChange={(e) => setForm({ ...form, id_producto: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600">Cantidad (unidades) *</label>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
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
              {editando ? 'Actualizar orden' : 'Crear orden'}
            </button>
            <button
              onClick={cerrarForm}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre"
          value={filtros.nombre}
          onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Buscar por marca"
          value={filtros.marca}
          onChange={(e) => setFiltros({ ...filtros, marca: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filtros.fechaDesde}
          onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
          title="Desde"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filtros.fechaHasta}
          onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
          title="Hasta"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="proceso">Proceso</option>
          <option value="terminado">Terminado</option>
        </select>
      </div>

      {!hayFiltrosActivos && (
        <p className="text-xs text-gray-400 mb-2">Mostrando las últimas 20 órdenes.</p>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Cantidad</th>
              <th className="px-4 py-3 text-left">Fecha planificada</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : ordenesAMostrar.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-8 text-gray-400">No hay órdenes que coincidan.</td></tr>
            ) : (
              ordenesAMostrar.map(o => {
                const info = infoProducto(o)
                return (
                  <tr key={o.id_orden} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{o.id_orden}</td>
                    <td className="px-4 py-3 font-medium">{info.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{info.marca || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${o.id_receta ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {o.id_receta ? 'Con receta' : 'Sin receta'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{o.cantidad}</td>
                    <td className="px-4 py-3">{new Date(o.fecha_planificada).toLocaleDateString('es-PE')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${colorEstado(o.estado)}`}>
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                          className="text-green-600 hover:text-green-800 text-xs mr-2"
                        >
                          Marcar terminada
                        </button>
                      )}
                      {o.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => handleEditar(o)}
                            className="text-blue-500 hover:text-blue-700 text-xs mr-2"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(o)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            🗑 Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}

export default OrdenesProduccion