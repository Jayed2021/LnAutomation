import { supabase } from '../../../lib/supabase';
import type { ShipmentPerformanceRow, ShipmentPerformanceDetailRow } from './types';

export async function fetchShipmentPerformanceList(): Promise<ShipmentPerformanceRow[]> {
  const { data, error } = await supabase.rpc('get_shipment_performance_list');
  if (error) throw error;
  return (data ?? []) as ShipmentPerformanceRow[];
}

export async function fetchShipmentPerformanceDetail(
  shipmentDbId: string
): Promise<ShipmentPerformanceDetailRow[]> {
  const { data, error } = await supabase.rpc('get_shipment_performance_detail', {
    p_shipment_db_id: shipmentDbId,
  });
  if (error) throw error;
  return (data ?? []) as ShipmentPerformanceDetailRow[];
}

export async function fetchHiddenShipmentIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('shipment_performance_hidden')
    .select('shipment_db_id');
  if (error) throw error;
  return new Set((data ?? []).map(r => r.shipment_db_id));
}

export async function hideShipment(shipmentDbId: string): Promise<void> {
  const { error } = await supabase
    .from('shipment_performance_hidden')
    .insert({ shipment_db_id: shipmentDbId });
  if (error) throw error;
}

export async function unhideShipment(shipmentDbId: string): Promise<void> {
  const { error } = await supabase
    .from('shipment_performance_hidden')
    .delete()
    .eq('shipment_db_id', shipmentDbId);
  if (error) throw error;
}
