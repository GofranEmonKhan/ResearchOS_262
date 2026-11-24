import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { BookingStatus, ListingType } from '@researchos/shared-types';

interface AccessDetailsCardProps {
  status: BookingStatus;
  accessDetails?: string | null;
  listingType: ListingType;
  accessMethod?: string | null;
  isProvider?: boolean;
  onOpenReleaseModal?: () => void;
}

export const AccessDetailsCard: React.FC<AccessDetailsCardProps> = ({
  status,
  accessDetails,
  listingType,
  accessMethod = 'SSH',
  isProvider,
  onOpenReleaseModal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!accessDetails) return;
    navigator.clipboard.writeText(accessDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isReleased = ['AccessReleased', 'Completed'].includes(status);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0D0F14]/90 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isReleased
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
            }`}
          >
            {listingType === 'Hardware' ? (
              <Terminal className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">
              {listingType === 'Hardware' ? `Compute Connection (${accessMethod})` : 'Dataset Access & Download'}
            </h4>
            <p className="text-xs text-slate-400">
              {isReleased
                ? 'Credentials active for your reserved session'
                : 'Credentials locked until escrow payment is confirmed'}
            </p>
          </div>
        </div>

        {isReleased && accessDetails && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Access
              </>
            )}
          </button>
        )}
      </div>

      {isReleased && accessDetails ? (
        <div className="space-y-3">
          <div className="relative rounded-lg bg-black/80 border border-slate-800 p-3.5 font-mono text-xs text-emerald-300 break-all select-all whitespace-pre-wrap">
            {accessDetails}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connection verified under encrypted academic tunnel. Access valid during booked slot duration.</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-900/60 border border-dashed border-slate-800 p-4 text-center space-y-2">
          <div className="flex justify-center">
            <KeyRound className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isProvider && status === 'PaymentEscrowed'
              ? 'Payment is held in escrow. Please release connection credentials to the requester.'
              : 'Sensitive hostnames, SSH keys, passwords, and private dataset links remain encrypted until payment escrow is held and the provider releases access.'}
          </p>

          {isProvider && status === 'PaymentEscrowed' && onOpenReleaseModal && (
            <button
              onClick={onOpenReleaseModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-950"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Release Access Credentials Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};
