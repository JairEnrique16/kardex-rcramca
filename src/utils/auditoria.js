import { supabase } from '../supabase'

export async function registrarAuditoria(userId, accion, modulo) {
  await supabase.from('auditoria_logs').insert({
    id_usuario: userId,
    accion_realizada: accion,
    tabla_afectada: modulo,
    fecha_hora: new Date().toISOString(),
  })
}