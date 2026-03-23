import { useState } from 'react';
import { useRefresh } from '../../contexts/RefreshContext';
import ReceiveList from './receive/ReceiveList';
import ReceiveFlow from './receive/ReceiveFlow';
import type { POForReceiving, Location } from './receive/types';

type View = 'list' | 'flow';

export default function ReceiveGoods() {
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [view, setView] = useState<View>('list');
  const [selectedPO, setSelectedPO] = useState<POForReceiving | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [resumeSessionId, setResumeSessionId] = useState<string | undefined>();
  const [listRefresh, setListRefresh] = useState(0);

  const handleSelectPO = (po: POForReceiving, locations: Location[], sessionId?: string) => {
    setSelectedPO(po);
    setSelectedLocations(locations);
    setResumeSessionId(sessionId);
    setView('flow');
  };

  const handleBack = () => {
    setView('list');
    setSelectedPO(null);
    setResumeSessionId(undefined);
  };

  const handleComplete = () => {
    setView('list');
    setSelectedPO(null);
    setResumeSessionId(undefined);
    setListRefresh(n => n + 1);
    setRefreshing(true);
  };

  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receive Goods</h1>
          <p className="text-sm text-gray-500 mt-1">Two-step receiving process — quantity check then quality inspection</p>
        </div>
        <ReceiveList
          onSelectPO={handleSelectPO}
          refreshTrigger={listRefresh + lastRefreshed}
          onLoadComplete={() => setRefreshing(false)}
        />
      </div>
    );
  }

  if (view === 'flow' && selectedPO) {
    return (
      <ReceiveFlow
        po={selectedPO}
        locations={selectedLocations}
        resumeSessionId={resumeSessionId}
        onBack={handleBack}
        onComplete={handleComplete}
      />
    );
  }

  return null;
}
