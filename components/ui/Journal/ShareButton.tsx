'use client';

import { useState } from 'react';
import {
  ShareIcon,
  LinkIcon,
  CheckIcon,
  EyeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import {
  ShareIcon as ShareIconSolid,
  LinkIcon as LinkIconSolid,
  CheckIcon as CheckIconSolid,
  EyeIcon as EyeIconSolid
} from '@heroicons/react/24/solid';

interface ShareButtonProps {
  accountId: string;
  accountName: string;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  id?: string;
}

export default function ShareButton({
  accountId,
  accountName,
  isPublic = false,
  onTogglePublic,
  id
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      // Generate a hash-based share URL
      const baseUrl = window.location.origin;
      const shareId = await generateAccountHash(accountId);
      const url = `${baseUrl}/share/${shareId}`;
      setShareUrl(url);

      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      setIsCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error generating share link:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAccountHash = async (accountId: string): Promise<string> => {
    // Create a simple hash of the account ID
    const encoder = new TextEncoder();
    const data = encoder.encode(accountId + 'marketpulse-share');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 16);
  };

  const handleTogglePublic = () => {
    if (onTogglePublic) {
      onTogglePublic(!isPublic);
    }
  };

  return (
    <div className="relative">
      {/* Share Button - only show if no id (not triggered externally) */}
      {!id && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
        >
          <ShareIconSolid className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Share</span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:to-purple-500/20 rounded-xl transition-all duration-300"></div>
        </button>
      )}

      {/* Dropdown Menu - show if open or if id is provided (external trigger) */}
      {(isOpen || id) && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl z-50">
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ShareIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Share Account</h3>
                <p className="text-slate-400 text-sm">{accountName}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Public Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg flex items-center justify-center">
                  {isPublic ? (
                    <EyeIconSolid className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <LockClosedIcon className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">Public Access</p>
                  <p className="text-slate-400 text-sm">
                    {isPublic
                      ? 'Account is publicly viewable'
                      : 'Account is private'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleTogglePublic}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  isPublic ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                    isPublic ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Share Link Section */}
            {isPublic && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <LinkIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300 text-sm font-medium">
                    Share Link
                  </span>
                </div>

                {shareUrl ? (
                  <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-slate-300 text-sm break-all">
                      {shareUrl}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={generateShareLink}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 hover:border-blue-400/50 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-blue-300 font-medium">
                          Generating...
                        </span>
                      </>
                    ) : isCopied ? (
                      <>
                        <CheckIconSolid className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <LinkIconSolid className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-300 font-medium">
                          Generate Link
                        </span>
                      </>
                    )}
                  </button>
                )}

                {isCopied && (
                  <div className="flex items-center space-x-2 text-emerald-400 text-sm">
                    <CheckIcon className="h-4 w-4" />
                    <span>Link copied to clipboard!</span>
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-slate-700/20 rounded-xl border border-slate-600/30">
              <p className="text-slate-400 text-xs leading-relaxed">
                {isPublic
                  ? "Anyone with the link can view this account's trading performance. They cannot edit or delete anything."
                  : "Enable public access to generate a shareable link for viewing this account's performance."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
