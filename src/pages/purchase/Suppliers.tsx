import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Building2, Phone, Mail, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AddSupplierModal from '../../components/purchase/AddSupplierModal';

interface Supplier {
  id: string;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  supplier_type: 'chinese' | 'local';
  alibaba_url: string | null;
  alipay_name: string | null;
  wechat_name: string | null;
  is_active: boolean;
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, code, name, email, phone, supplier_type, alibaba_url, alipay_name, wechat_name, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Load suppliers error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [lastRefreshed]);

  const filtered = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code?.toLowerCase().includes(q) ?? false) ||
      (s.email?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier information and payment details</p>
        </div>
        <Button
          className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-800"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No suppliers found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ? 'Try a different search term' : 'Add your first supplier to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(supplier => (
              <div
                key={supplier.id}
                onClick={() => navigate(`/purchase/suppliers/${supplier.id}`)}
                className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                      {supplier.code ? (
                        <span className="text-sm font-bold text-gray-700">{supplier.code}</span>
                      ) : (
                        <Building2 className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                        {supplier.code && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            {supplier.code}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                          supplier.supplier_type === 'local'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {supplier.supplier_type === 'local' ? 'Local' : 'Chinese'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {supplier.alipay_name && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                              Alipay
                            </span>
                          )}
                          {supplier.wechat_name && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                              WeChat
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Phone className="w-3.5 h-3.5" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.alibaba_url && (
                          <div className="flex items-center gap-1.5 text-sm text-blue-500">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Alibaba Store
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors ml-4">
                    View details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddSupplierModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={load}
      />
    </div>
  );
}
