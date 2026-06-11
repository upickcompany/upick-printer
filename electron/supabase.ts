/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { store } from './store';
import { printOrder } from './printer';

// Leer variables de entorno (cargadas por Vite en import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Faltan variables de entorno de Supabase.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export async function setupSupabaseRealtime(onStatusChange: (status: 'connected' | 'disconnected' | 'error') => void) {
  const restaurantId = store.get('restaurantId');

  if (!restaurantId) {
    console.log('No Restaurant ID configured, skipping Realtime setup');
    onStatusChange('disconnected');
    return;
  }

  // Si ya había un canal, lo cerramos antes de abrir uno nuevo
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
  }

  console.log(`Setting up Supabase Realtime for Restaurant ID: ${restaurantId}`);

  realtimeChannel = supabase.channel(`public:Order:restaurantId=eq.${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Escuchar INSERT y UPDATE
        schema: 'public',
        table: 'Order',
        filter: `restaurantId=eq.${restaurantId}`
      },
      async (payload) => {
        console.log('Cambio detectado en Order:', payload);
        
        const newRecord = payload.new as any;

        // Solo nos interesa si tiene printStatus = PENDING
        if (newRecord && newRecord.printStatus === 'PENDING') {
          console.log(`¡Orden #${newRecord.pickupCode} lista para imprimir!`);
          
          try {
            // Obtenemos los detalles completos de la orden (items, estudiante, etc)
            // Ya que el evento realtime solo trae la tabla Order sin las relaciones
            const { data: fullOrder, error } = await supabase
              .from('Order')
              .select(`
                *,
                student:studentId (firstName, lastName, email),
                items:OrderItem (
                  quantity,
                  unitPrice,
                  product:productId (name)
                )
              `)
              .eq('id', newRecord.id)
              .single();

            if (error || !fullOrder) {
              console.error('Error fetching full order details:', error);
              return;
            }

            // Enviamos a la impresora
            const success = await printOrder(fullOrder);

            if (success) {
              // Actualizamos el estado a PRINTED
              await supabase
                .from('Order')
                .update({ 
                  printStatus: 'PRINTED', 
                  printedAt: new Date().toISOString() 
                })
                .eq('id', newRecord.id);
              console.log(`Orden #${newRecord.pickupCode} marcada como PRINTED`);
            }
          } catch (err) {
            console.error('Fallo al imprimir la orden:', err);
            // Si falla, podemos marcarlo como FAILED
            await supabase
              .from('Order')
              .update({ printStatus: 'FAILED' })
              .eq('id', newRecord.id);
          }
        }
      }
    )
    .subscribe((status) => {
      console.log('Supabase Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        onStatusChange('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange('error');
      } else {
        onStatusChange('disconnected');
      }
    });
}
