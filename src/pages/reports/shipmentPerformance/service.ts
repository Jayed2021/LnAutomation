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
