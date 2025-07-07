'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Clock
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { User } from '@supabase/supabase-js';

interface VIPWhitelistWidgetProps {
  user: User;
  subscription: any;
}

export default function VIPWhitelistWidget({
  user,
  subscription
}: VIPWhitelistWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bybitUid, setBybitUid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is VIP (has VIP subscription)
  const isVIP =
    subscription?.prices?.products?.name?.toLowerCase().includes('vip') ||
    subscription?.prices?.products?.name?.toLowerCase().includes('automatic');

  // Check for existing whitelist request on component mount
  useEffect(() => {
    if (isVIP) {
      checkExistingRequest();
    }
  }, [isVIP]);

  const checkExistingRequest = async () => {
    try {
      const response = await fetch(`/api/bybit/whitelist?userId=${user.id}`);
      const data = await response.json();

      if (response.ok) {
        setExistingRequest(data.request);
      }
    } catch (error) {
      console.error('Error checking existing request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bybitUid.trim()) {
      setError('Please enter your Bybit UID');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/bybit/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bybitUid: bybitUid.trim(),
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setBybitUid('');
        // Update existing request state
        setExistingRequest({
          id: data.requestId,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        // Close modal after 3 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitted(false);
        }, 3000);
      } else {
        setError(data.error || 'Failed to submit whitelist request');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    setSubmitted(false);
    setError(null);
    setBybitUid('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitted(false);
    setError(null);
    setBybitUid('');
  };

  if (!isVIP) {
    return null; // Don't show for non-VIP users
  }

  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 bg-slate-600 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed"
      >
        <Clock className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </button>
    );
  }

  // If user has an existing request, show status instead of submit button
  if (existingRequest) {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved':
          return 'bg-emerald-600 hover:bg-emerald-700';
        case 'pending':
          return 'bg-yellow-600 hover:bg-yellow-700';
        case 'rejected':
          return 'bg-red-600 hover:bg-red-700';
        default:
          return 'bg-slate-600';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'approved':
          return 'Whitelisted';
        case 'pending':
          return 'Pending Review';
        case 'rejected':
          return 'Request Rejected';
        default:
          return 'Unknown Status';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'approved':
          return <CheckCircle className="w-4 h-4 mr-2" />;
        case 'pending':
          return <Clock className="w-4 h-4 mr-2" />;
        case 'rejected':
          return <AlertTriangle className="w-4 h-4 mr-2" />;
        default:
          return <Crown className="w-4 h-4 mr-2" />;
      }
    };

    return (
      <button
        disabled
        className={`inline-flex items-center px-4 py-2 ${getStatusColor(existingRequest.status)} text-white text-sm font-medium rounded-lg cursor-not-allowed`}
        title={`Request submitted on ${new Date(existingRequest.created_at).toLocaleDateString()}`}
      >
        {getStatusIcon(existingRequest.status)}
        {getStatusText(existingRequest.status)}
      </button>
    );
  }

  return (
    <>
      {/* Whitelist Button */}
      <button
        onClick={openModal}
        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all duration-200 group"
      >
        <Crown className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
        Submit Whitelist
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
                  <Crown className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    VIP Whitelist Access
                  </h3>
                  <p className="text-sm text-slate-400">
                    Submit your Bybit UID for automatic trading access
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mr-2" />
                    <span className="text-emerald-200 text-sm font-medium">
                      Whitelist request submitted successfully!
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2">
                    We'll process your request and add you to the whitelist
                    within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="bybitUid"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Bybit UID
                    </label>
                    <Input
                      id="bybitUid"
                      type="text"
                      value={bybitUid}
                      onChange={(value: string) => setBybitUid(value)}
                      placeholder="Enter your Bybit UID (e.g., 12345678)"
                      className="w-full"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This is your unique Bybit user ID for whitelist access
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                        <span className="text-red-200 text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    loading={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isSubmitting
                      ? 'Submitting...'
                      : 'Submit for Whitelist Access'}
                  </Button>
                </form>
              )}

              {/* Tutorial Section */}
              <div className="mt-6 bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Info className="w-4 h-4 text-blue-400 mr-2" />
                  <h4 className="text-sm font-medium text-white">
                    How to Find Your Bybit UID
                  </h4>
                </div>

                <div className="space-y-3 text-xs text-slate-400">
                  <div className="flex items-start">
                    <span className="bg-slate-600 text-slate-300 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-slate-300 mb-1">
                        Log into your Bybit account
                      </p>
                      <p>
                        Go to{' '}
                        <a
                          href="https://www.bybit.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          bybit.com
                        </a>{' '}
                        and sign in
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start text-left">
                    <span className="bg-slate-600 text-slate-300 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-slate-300 mb-1">
                        Navigate to Account Settings
                      </p>
                      <p>Click on your profile icon → "Account Settings"</p>
                    </div>
                  </div>

                  <div className="flex items-start text-left">
                    <span className="bg-slate-600 text-slate-300 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-slate-300 mb-1">
                        Find your UID
                      </p>
                      <p>
                        Look for "UID" or "User ID" in the account information
                        section
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start text-left">
                    <span className="bg-slate-600 text-slate-300 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                      4
                    </span>
                    <div>
                      <p className="font-medium text-slate-300 mb-1">
                        Copy and paste
                      </p>
                      <p>
                        Copy the UID (usually 8-10 digits) and paste it above
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-200">
                    <strong>Note:</strong> Your UID is different from your
                    username. It's a unique numeric identifier that starts with
                    numbers only.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
