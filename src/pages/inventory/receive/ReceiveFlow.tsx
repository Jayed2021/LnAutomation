import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import StepQuantityCheck from './StepQuantityCheck';
import StepQualityCheck from './StepQualityCheck';
import StepComplete from './StepComplete';
import { upsertSession, finalizeQtyCheck, finalizeQC, loadSession } from './service';
import type { ReceiptSession, ReceiptLine, POForReceiving, Location } from './types';

interface Props {
  po: POForReceiving;
  locations: Location[];
  resumeSessionId?: string;
  onBack: () => void;
  onComplete: () => void;
}

function buildDefaultLines(po: POForReceiving, shipmentName: string, defaultLocationId: string): ReceiptLine[] {
  return po.items.map(item => ({
    po_item_id: item.id,
    product_id: null,
    sku: item.sku,
    product_name: item.product_name,
    product_image_url: item.product_image_url,
    ordered_qty: item.remaining,
    qty_checked: item.remaining,
    qty_good: item.remaining,
    qty_damaged: 0,
    landed_cost_per_unit: item.landed_cost_per_unit,
    location_id: defaultLocationId,
    barcode: `${item.sku}-${shipmentName}`,
    line_notes: ''
  }));
}

async function resolveProductIds(lines: ReceiptLine[]): Promise<ReceiptLine[]> {
  const skus = lines.map(l => l.sku);
  const { data } = await supabase.from('products').select('id, sku').in('sku', skus);
  const map: Record<string, string> = {};
  (data || []).forEach((p: any) => { map[p.sku] = p.id; });
  return lines.map(l => ({ ...l, product_id: map[l.sku] || null }));
}

function buildShipmentName(po: POForReceiving): string {
  const existing = po.activeSessions.length;
  const baseName = po.po_shipment_name || po.po_number;
  return existing > 0 ? `${baseName}-S${existing + 1}` : baseName;
}

export default function ReceiveFlow({ po, locations, resumeSessionId, onBack, onComplete }: Props) {
  const { user } = useAuth();
  const [session, setSession] = useState<ReceiptSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    setLoading(true);
    try {
      if (resumeSessionId) {
        const existing = await loadSession(resumeSessionId);
        if (existing) {
          const resolvedLines = await resolveProductIds(existing.lines);
          setSession({ ...existing, lines: resolvedLines });
          setLoading(false);
          return;
        }
      }

      const defaultLocationId = locations[0]?.id || '';
      const shipmentName = buildShipmentName(po);
      let lines = buildDefaultLines(po, shipmentName, defaultLocationId);
      lines = await resolveProductIds(lines);

      setSession({
        po_id: po.id,
        shipment_name: shipmentName,
        step: 'qty_check',
        add_to_stock_immediately: false,
        stock_added_at_qty_check: false,
        qty_check_date: new Date().toISOString().slice(0, 10),
        qc_date: '',
        qty_check_notes: '',
        qc_notes: '',
        good_photo_urls: [],
        damaged_photo_urls: [],
        damaged_drive_links: [],
        good_drive_links: [],
        lines
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSession = (updates: Partial<ReceiptSession>) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      if (updates.shipment_name !== undefined) {
        updated.lines = (updates.lines ?? prev.lines).map(l => ({
          ...l,
          barcode: `${l.sku}-${updates.shipment_name}`
        }));
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!session || !user) return;
    setSaving(true);
    try {
      const sessionId = await upsertSession(session, user.id);
      setSession(prev => prev ? { ...prev, id: sessionId } : prev);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteWithoutStock = async () => {
    if (!session || !user) return;
    setSaving(true);
    try {
      const updatedSession: ReceiptSession = {
        ...session,
        step: 'qty_checked',
        add_to_stock_immediately: false,
        lines: session.lines.map(l => ({ ...l, qty_good: l.qty_checked, qty_damaged: 0 }))
      };
      const sessionId = await upsertSession(updatedSession, user.id);
      setSession({ ...updatedSession, id: sessionId, step: 'qc_in_progress' });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteAndAddStock = async () => {
    if (!session || !user) return;
    setSaving(true);
    try {
      const updatedSession: ReceiptSession = {
        ...session,
        lines: session.lines.map(l => ({ ...l, qty_good: l.qty_checked, qty_damaged: 0 }))
      };
      const { sessionId } = await finalizeQtyCheck(updatedSession, po, user.id);
      const reloaded = await loadSession(sessionId);
      if (reloaded) {
        setSession({ ...reloaded, step: 'qc_in_progress' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteQC = async () => {
    if (!session || !user) return;
    setSaving(true);
    try {
      const sessionId = await finalizeQC(session, po, user.id);
      const reloaded = await loadSession(sessionId);
      if (reloaded) setSession(reloaded);
    } finally {
      setSaving(false);
    }
  };

  const handleBackFromQC = () => {
    if (!session) return;
    setSession(prev => prev ? { ...prev, step: 'qty_check' } : prev);
  };

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading session...
      </div>
    );
  }

  if (session.step === 'complete') {
    return <StepComplete po={po} session={session} onDone={onComplete} />;
  }

  if (session.step === 'qty_checked' || session.step === 'qc_in_progress') {
    return (
      <StepQualityCheck
        po={po}
        session={session}
        saving={saving}
        onUpdate={updateSession}
        onSave={handleSave}
        onComplete={handleCompleteQC}
        onBack={handleBackFromQC}
      />
    );
  }

  return (
    <StepQuantityCheck
      po={po}
      session={session}
      locations={locations}
      saving={saving}
      onUpdate={updateSession}
      onSave={handleSave}
      onCompleteWithoutStock={handleCompleteWithoutStock}
      onCompleteAndAddStock={handleCompleteAndAddStock}
      onBack={onBack}
    />
  );
}
