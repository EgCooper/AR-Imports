import { Mail, MessageCircle } from 'lucide-react';

import { openEmailShare, openWhatsAppShare } from '../../utils/shareDocument.js';

export default function ShareActions({
  whatsappText,
  email,
  emailSubject,
  emailBody,
  phone,
  compact = false,
  className = '',
}) {
  const handleWhatsApp = () => openWhatsAppShare(phone, whatsappText);
  const handleEmail = () => openEmailShare(email, emailSubject, emailBody);

  const btnClass = compact
    ? 'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50'
    : 'app-btn-secondary min-h-11 gap-2';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" onClick={handleWhatsApp} className={btnClass}>
        <MessageCircle className="h-4 w-4 text-emerald-600" />
        WhatsApp
      </button>
      <button type="button" onClick={handleEmail} className={btnClass}>
        <Mail className="h-4 w-4 text-slate-600" />
        Email
      </button>
    </div>
  );
}
