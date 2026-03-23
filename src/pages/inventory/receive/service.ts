import { supabase } from '../../../lib/supabase';
import type { POForReceiving, ReceiptSession, ReceiptLine, Location } from './types';

export async function loadPOsForReceiving(): Promise<{ pos: POForReceiving[]; locations: Location[] }> {
  const [posRes, locsRes, sessionsRes] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select(`id, po_number, shipment_name, expected_delivery_date, notes, created_at, suppliers(name), purchase_order_items(id, sku, product_name, product_image_url, ordered_quantity, received_quantity, landed_cost_per_unit)`)
      .in('status', ['ordered', 'confirmed', 'partially_received'])
      .order('expected_delivery_date'),
    supabase
      .from('warehouse_locations')
      .select('id, code, name')
      .eq('is_active', true)
      .eq('location_type', 'storage')
      .order('code'),
    supabase
      .from('goods_receipt_sessions')
      .select('id, po_id, shipment_name, step, created_at, updated_at')
      .neq('step', 'complete')
  ]);

  const sessionsByPO: Record<string, any[]> = {};
  for (const s of sessionsRes.data || []) {
    if (!sessionsByPO[s.po_id]) sessionsByPO[s.po_id] = [];
    sessionsByPO[s.po_id].push(s);
  }

  const pos: POForReceiving[] = (posRes.data || []).map((po: any) => ({
    id: po.id,
    po_number: po.po_number,
    po_shipment_name: po.shipment_name || null,
    supplier_name: po.suppliers?.name || 'Unknown',
    expected_delivery_date: po.expected_delivery_date,
    created_at: po.created_at,
    notes: po.notes,
    items: (po.purchase_order_items || []).map((item: any) => ({
      id: item.id,
      sku: item.sku,
      product_name: item.product_name,
      product_image_url: item.product_image_url || null,
      ordered_quantity: item.ordered_quantity,
      received_quantity: item.received_quantity ?? 0,
      landed_cost_per_unit: item.landed_cost_per_unit ?? 0,
      remaining: item.ordered_quantity - (item.received_quantity ?? 0)
    })).filter((i: any) => i.remaining > 0),
    activeSessions: (sessionsByPO[po.id] || []).map((s: any) => ({
      id: s.id,
      shipment_name: s.shipment_name,
      step: s.step,
      created_at: s.created_at,
      updated_at: s.updated_at
    }))
  })).filter(po => po.items.length > 0 || (sessionsByPO[po.id] || []).length > 0);

  const locations: Location[] = (locsRes.data || []).map((l: any) => ({ id: l.id, code: l.code, name: l.name }));

  return { pos, locations };
}

export async function loadSession(sessionId: string): Promise<ReceiptSession | null> {
  const [sessionRes, linesRes] = await Promise.all([
    supabase.from('goods_receipt_sessions').select('*').eq('id', sessionId).maybeSingle(),
    supabase.from('goods_receipt_lines').select('*').eq('session_id', sessionId).order('created_at')
  ]);
  if (!sessionRes.data) return null;
  const s = sessionRes.data;
  return {
    id: s.id,
    po_id: s.po_id,
    shipment_name: s.shipment_name,
    step: s.step,
    add_to_stock_immediately: s.add_to_stock_immediately,
    stock_added_at_qty_check: s.stock_added_at_qty_check,
    qty_check_date: s.qty_check_date || '',
    qc_date: s.qc_date || '',
    qty_check_notes: s.qty_check_notes || '',
    qc_notes: s.qc_notes || '',
    good_photo_urls: s.good_photo_urls || [],
    damaged_photo_urls: s.damaged_photo_urls || [],
    damaged_drive_links: s.damaged_drive_links || [],
    good_drive_links: s.good_drive_links || [],
    shipment_db_id: s.shipment_db_id,
    lines: (linesRes.data || []).map((l: any) => ({
      id: l.id,
      po_item_id: l.po_item_id,
      product_id: l.product_id,
      sku: l.sku,
      product_name: l.product_name,
      product_image_url: l.product_image_url,
      ordered_qty: l.ordered_qty,
      qty_checked: l.qty_checked,
      qty_good: l.qty_good,
      qty_damaged: l.qty_damaged,
      landed_cost_per_unit: l.landed_cost_per_unit,
      location_id: l.location_id || '',
      barcode: l.barcode,
      line_notes: l.line_notes || '',
      lot_id: l.lot_id
    }))
  };
}

export async function upsertSession(session: ReceiptSession, userId: string): Promise<string> {
  const sessionData = {
    po_id: session.po_id,
    shipment_name: session.shipment_name,
    step: session.step,
    add_to_stock_immediately: session.add_to_stock_immediately,
    stock_added_at_qty_check: session.stock_added_at_qty_check,
    qty_check_date: session.qty_check_date || null,
    qc_date: session.qc_date || null,
    qty_check_notes: session.qty_check_notes,
    qc_notes: session.qc_notes,
    good_photo_urls: session.good_photo_urls,
    damaged_photo_urls: session.damaged_photo_urls,
    damaged_drive_links: session.damaged_drive_links,
    good_drive_links: session.good_drive_links,
    shipment_db_id: session.shipment_db_id || null,
    updated_at: new Date().toISOString()
  };

  let sessionId = session.id;
  if (sessionId) {
    await supabase.from('goods_receipt_sessions').update(sessionData).eq('id', sessionId);
  } else {
    const { data } = await supabase
      .from('goods_receipt_sessions')
      .insert({ ...sessionData, created_by: userId })
      .select('id')
      .single();
    sessionId = data!.id;
  }

  if (session.lines.length > 0) {
    await supabase.from('goods_receipt_lines').delete().eq('session_id', sessionId);
    await supabase.from('goods_receipt_lines').insert(
      session.lines.map(l => ({
        session_id: sessionId,
        po_item_id: l.po_item_id || null,
        product_id: l.product_id || null,
        sku: l.sku,
        product_name: l.product_name,
        product_image_url: l.product_image_url || null,
        ordered_qty: l.ordered_qty,
        qty_checked: l.qty_checked,
        qty_good: l.qty_good,
        qty_damaged: l.qty_damaged,
        landed_cost_per_unit: l.landed_cost_per_unit,
        location_id: l.location_id || null,
        lot_id: l.lot_id || null,
        barcode: l.barcode,
        line_notes: l.line_notes
      }))
    );
  }

  return sessionId!;
}

export async function finalizeQtyCheck(
  session: ReceiptSession,
  po: { id: string; po_number: string },
  userId: string
): Promise<{ sessionId: string; shipmentDbId: string }> {
  const { data: shipment } = await supabase
    .from('shipments')
    .insert({
      shipment_id: session.shipment_name,
      po_id: po.id,
      received_date: session.qty_check_date || new Date().toISOString().slice(0, 10),
      received_by: userId,
      notes: `Received via Receive Goods flow`
    })
    .select()
    .single();

  const updatedLines: ReceiptLine[] = [];

  for (const line of session.lines) {
    if (!line.product_id || line.qty_checked <= 0) {
      updatedLines.push(line);
      continue;
    }

    const lotNumber = `LOT-${session.shipment_name}-${line.sku}`.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    const { data: lot } = await supabase.from('inventory_lots').insert({
      lot_number: lotNumber,
      product_id: line.product_id,
      shipment_id: shipment!.id,
      po_id: po.id,
      location_id: line.location_id,
      received_date: session.qty_check_date || new Date().toISOString().slice(0, 10),
      received_quantity: line.qty_checked,
      remaining_quantity: line.qty_checked,
      landed_cost_per_unit: line.landed_cost_per_unit,
      barcode: line.barcode
    }).select('id').single();

    await supabase.from('stock_movements').insert({
      movement_type: 'receipt',
      product_id: line.product_id,
      to_location_id: line.location_id,
      quantity: line.qty_checked,
      reference_type: 'po',
      notes: `Received from ${po.po_number} - ${session.shipment_name}`,
      performed_by: userId
    });

    const { data: currentItem } = await supabase
      .from('purchase_order_items')
      .select('received_quantity')
      .eq('id', line.po_item_id)
      .maybeSingle();
    await supabase
      .from('purchase_order_items')
      .update({ received_quantity: (currentItem?.received_quantity ?? 0) + line.qty_checked })
      .eq('id', line.po_item_id);

    updatedLines.push({ ...line, lot_id: lot?.id || null });
  }

  await updatePOStatus(po.id);

  const updatedSession: ReceiptSession = {
    ...session,
    step: 'qty_checked',
    stock_added_at_qty_check: true,
    shipment_db_id: shipment!.id,
    lines: updatedLines
  };

  const sessionId = await upsertSession(updatedSession, userId);
  return { sessionId, shipmentDbId: shipment!.id };
}

export async function finalizeQC(
  session: ReceiptSession,
  po: { id: string; po_number: string },
  userId: string
): Promise<string> {
  const { data: damagedLoc } = await supabase
    .from('warehouse_locations')
    .select('id')
    .eq('location_type', 'damaged')
    .maybeSingle();

  let shipmentDbId = session.shipment_db_id;

  if (!session.stock_added_at_qty_check) {
    const { data: shipment } = await supabase
      .from('shipments')
      .insert({
        shipment_id: session.shipment_name,
        po_id: po.id,
        received_date: session.qty_check_date || new Date().toISOString().slice(0, 10),
        received_by: userId,
        notes: `Received via two-step Receive Goods flow`
      })
      .select()
      .single();
    shipmentDbId = shipment!.id;

    for (const line of session.lines) {
      if (!line.product_id || line.qty_good <= 0) continue;

      const lotNumber = `LOT-${session.shipment_name}-${line.sku}`.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
      await supabase.from('inventory_lots').insert({
        lot_number: lotNumber,
        product_id: line.product_id,
        shipment_id: shipment!.id,
        po_id: po.id,
        location_id: line.location_id,
        received_date: session.qc_date || new Date().toISOString().slice(0, 10),
        received_quantity: line.qty_good,
        remaining_quantity: line.qty_good,
        landed_cost_per_unit: line.landed_cost_per_unit,
        barcode: line.barcode
      });

      await supabase.from('stock_movements').insert({
        movement_type: 'receipt',
        product_id: line.product_id,
        to_location_id: line.location_id,
        quantity: line.qty_good,
        reference_type: 'po',
        notes: `QC passed - received from ${po.po_number} - ${session.shipment_name}`,
        performed_by: userId
      });

      const { data: currentItem } = await supabase
        .from('purchase_order_items')
        .select('received_quantity')
        .eq('id', line.po_item_id)
        .maybeSingle();
      await supabase
        .from('purchase_order_items')
        .update({ received_quantity: (currentItem?.received_quantity ?? 0) + line.qty_good })
        .eq('id', line.po_item_id);
    }
  } else {
    for (const line of session.lines) {
      if (!line.product_id || line.qty_damaged <= 0 || !damagedLoc) continue;
      if (line.lot_id && line.qty_checked > 0) {
        const adjustQty = line.qty_damaged;
        const { data: lot } = await supabase.from('inventory_lots').select('remaining_quantity').eq('id', line.lot_id).maybeSingle();
        if (lot) {
          await supabase.from('inventory_lots').update({
            received_quantity: line.qty_good,
            remaining_quantity: Math.max(0, (lot.remaining_quantity ?? 0) - adjustQty)
          }).eq('id', line.lot_id);
        }
        await supabase.from('stock_movements').insert({
          movement_type: 'adjustment',
          product_id: line.product_id,
          from_location_id: line.location_id,
          to_location_id: damagedLoc.id,
          quantity: adjustQty,
          reference_type: 'po',
          notes: `QC: ${adjustQty} damaged units moved from ${po.po_number} - ${session.shipment_name}`,
          performed_by: userId
        });
      }
    }
  }

  for (const line of session.lines) {
    if (!line.product_id || line.qty_damaged <= 0 || !damagedLoc) continue;
    const dmgLotNumber = `LOT-${session.shipment_name}-${line.sku}-DMG`.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    await supabase.from('inventory_lots').insert({
      lot_number: dmgLotNumber,
      product_id: line.product_id,
      shipment_id: shipmentDbId || null,
      po_id: po.id,
      location_id: damagedLoc.id,
      received_date: session.qc_date || new Date().toISOString().slice(0, 10),
      received_quantity: line.qty_damaged,
      remaining_quantity: line.qty_damaged,
      landed_cost_per_unit: line.landed_cost_per_unit,
      barcode: `${line.barcode}-DMG`
    });

    await supabase.from('stock_movements').insert({
      movement_type: 'damaged',
      product_id: line.product_id,
      to_location_id: damagedLoc.id,
      quantity: line.qty_damaged,
      reference_type: 'po',
      notes: `Damaged on QC from ${po.po_number} - ${session.shipment_name}`,
      performed_by: userId
    });
  }

  await updatePOStatus(po.id);

  const completedSession: ReceiptSession = {
    ...session,
    step: 'complete',
    shipment_db_id: shipmentDbId
  };
  return upsertSession(completedSession, userId);
}

async function updatePOStatus(poId: string) {
  const { data: updatedItems } = await supabase
    .from('purchase_order_items')
    .select('ordered_quantity, received_quantity')
    .eq('po_id', poId);
  const totalOrdered = (updatedItems || []).reduce((s, i) => s + (i.ordered_quantity ?? 0), 0);
  const totalReceived = (updatedItems || []).reduce((s, i) => s + (i.received_quantity ?? 0), 0);
  if (totalReceived >= totalOrdered) {
    await supabase.from('purchase_orders').update({ status: 'received_complete' }).eq('id', poId);
  } else {
    await supabase.from('purchase_orders').update({ status: 'partially_received' }).eq('id', poId);
  }
}

export async function uploadReceiptPhoto(
  file: File,
  sessionId: string,
  type: 'good' | 'damaged'
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `receipts/${sessionId}/${type}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
