import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface Props {
  phone: string;
}

const TEMPLATES = [
  { label: 'Order Confirmed', text: 'আপনার অর্ডারটি নিশ্চিত করা হয়েছে। শীঘ্রই ডেলিভারি দেওয়া হবে।' },
  { label: 'Out for Delivery', text: 'আপনার পার্সেলটি ডেলিভারির জন্য পাঠানো হয়েছে।' },
  { label: 'Payment Reminder', text: 'আপনার অর্ডারের পেমেন্ট এখনো বাকি আছে। দ্রুত পরিশোধ করুন।' },
];

export function SmsCard({ phone }: Props) {
  const [recipient, setRecipient] = useState(phone);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!recipient || !message.trim()) return;
    setSending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Send SMS to Customer</h3>
      </div>

      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 mb-1.5">Recipient Phone Number</div>
        <input
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            onClick={() => setMessage(t.text)}
            className="text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Type your SMS message here..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none pr-32"
        />
        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || !recipient}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {sent ? 'Sent!' : sending ? 'Sending...' : 'Send SMS'}
        </button>
      </div>

      <div className="mt-2 text-xs text-blue-600">Via SMS API</div>
    </div>
  );
}
