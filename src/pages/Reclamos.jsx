import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

function Reclamos() {
  const [reclamos, setReclamos] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [filtroVenta, setFiltroVenta] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [form, setForm] = useState({
    id_venta: '',
    motivo: '',
    descripcion: '',
    estado: 'abierto',
  })

  useEffect(() => {
    cargarReclamos()
    cargarVentas()
  }, [])

  async function cargarReclamos(conFiltros = false) {
    setLoading(true)

    let query = supabase
      .from('registro_reclamos')
      .select('*, ventas_cabecera(id_venta, fecha, total_venta, clientes(nombre_razon_social))')
      .order('id_reclamo', { ascending: false })

    if (filtroEstado) query = query.eq('estado', filtroEstado)
    if (!conFiltros) query = query.limit(20)

    const { data } = await query

    let resultado = data || []

    if (filtroVenta) {
      resultado = resultado.filter(r =>
        r.id_venta?.toString().includes(filtroVenta)
      )
    }

    setReclamos(resultado)
    setLoading(false)
  }

  async function cargarVentas() {
    const { data } = await supabase
      .from('ventas_cabecera')
      .select('*, clientes(nombre_razon_social)')
      .order('fecha', { ascending: false })
    setVentas(data || [])
  }

  function etiquetaVenta(v) {
  const cliente = v.clientes?.nombre_razon_social || v.cliente_ocasional || 'Cliente ocasional'
  const fecha = new Date(v.fecha).toLocaleDateString('es-PE')
  const total = v.total_venta != null ? ` — S/ ${v.total_venta}` : ''
  return `#${v.id_venta} · ${cliente} · ${fecha}${total}`
}

  async function handleGuardar() {
    if (!form.id_venta || !form.motivo) {
      alert('Venta y motivo son obligatorios')
      return
    }

    if (editando) {
      const { error } = await supabase.from('registro_reclamos').update({
        motivo: form.motivo,
        descripcion: form.descripcion,
        estado: form.estado,
      }).eq('id_reclamo', editando)
      if (error) { alert('Error: ' + error.message); return }
    } else {
      const { error } = await supabase.from('registro_reclamos').insert({
        id_venta: parseInt(form.id_venta),
        motivo: form.motivo,
        descripcion: form.descripcion,
        estado: form.estado,
      })
      if (error) { alert('Error: ' + error.message); return }
    }

    setShowForm(false)
    setEditando(null)
    setForm({ id_venta: '', motivo: '', descripcion: '', estado: 'abierto' })
    cargarReclamos()
  }

  function handleEditar(r) {
    setEditando(r.id_reclamo)
    setForm({
      id_venta: r.id_venta,
      motivo: r.motivo,
      descripcion: r.descripcion || '',
      estado: r.estado,
    })
    setShowForm(true)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este reclamo?')) return
    await supabase.from('registro_reclamos').delete().eq('id_reclamo', id)
    cargarReclamos()
  }

  async function handleCambiarEstado(id, estado) {
    await supabase.from('registro_reclamos').update({ estado }).eq('id_reclamo', id)
    cargarReclamos()
  }

  function handleBuscar() {
    setBuscando(true)
    cargarReclamos(true)
  }

  function handleLimpiar() {
    setFiltroVenta('')
    setFiltroEstado('')
    setBuscando(false)
    cargarReclamos(false)
  }

  function colorEstado(estado) {
    if (estado === 'cerrado') return 'bg-green-100 text-green-700'
    if (estado === 'en_proceso') return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Reclamos</h2>
        <button
          onClick={() => { setShowForm(true); setEditando(null); setForm({ id_venta: '', motivo: '', descripcion: '', estado: 'abierto' }) }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          + Registrar reclamo
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">
            {editando ? 'Editar Reclamo' : 'Nuevo Reclamo'}
          </h3>
          <div className="space-y-4">
            {!editando && (
              <div>
                <label className="text-sm text-gray-600">Venta relacionada *</label>
                <select
                  value={form.id_venta}
                  onChange={(e) => setForm({ ...form, id_venta: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                >
                  <option value="">Seleccionar venta</option>
                  {ventas.map(v => (
                    <option key={v.id_venta} value={v.id_venta}>
                      {etiquetaVenta(v)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600">Motivo *</label>
              <input type="text" value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej: Producto dañado, entrega incorrecta"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Descripción</label>
              <textarea value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                rows="3" />
            </div>
            {editando && (
              <div>
                <label className="text-sm text-gray-600">Estado</label>
                <select value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="abierto">Abierto</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleGuardar}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                {editando ? 'Actualizar' : 'Guardar'}
              </button>
              <button onClick={() => { setShowForm(false); setEditando(null) }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500">N° de Venta</label>
            <input type="text" placeholder="Buscar por N° venta..."
              value={filtroVenta}
              onChange={(e) => setFiltroVenta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Estado</label>
            <select value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Todos</option>
              <option value="abierto">Abierto</option>
              <option value="en_proceso">En proceso</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleBuscar}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              Buscar
            </button>
            <button onClick={handleLimpiar}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm">
              Limpiar
            </button>
          </div>
        </div>
        {!buscando && <p className="text-xs text-gray-400">Mostrando últimos 20 reclamos.</p>}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Venta</th>
              <th className="px-4 py-3 text-left">Motivo</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : reclamos.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-400">No hay reclamos registrados.</td></tr>
            ) : (
              reclamos.map(r => (
                <tr key={r.id_reclamo} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{r.id_reclamo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700">
                      {r.ventas_cabecera?.clientes?.nombre_razon_social || r.ventas_cabecera?.cliente_ocasional || 'Cliente ocasional'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Venta #{r.id_venta} · {r.ventas_cabecera?.fecha ? new Date(r.ventas_cabecera.fecha).toLocaleDateString('es-PE') : '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">{r.motivo}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.descripcion || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${colorEstado(r.estado)}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditar(r)}
                      className="text-blue-500 hover:text-blue-700 text-xs">Editar</button>
                    {r.estado === 'abierto' && (
                      <button onClick={() => handleCambiarEstado(r.id_reclamo, 'en_proceso')}
                        className="text-yellow-600 hover:text-yellow-800 text-xs">En proceso</button>
                    )}
                    {r.estado === 'en_proceso' && (
                      <button onClick={() => handleCambiarEstado(r.id_reclamo, 'cerrado')}
                        className="text-green-600 hover:text-green-800 text-xs">Cerrar</button>
                    )}
                    <button onClick={() => handleEliminar(r.id_reclamo)}
                      className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
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

export default Reclamos