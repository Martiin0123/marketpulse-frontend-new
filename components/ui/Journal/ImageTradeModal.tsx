'use client';

import { useState, useRef } from 'react';
import {
  XMarkIcon,
  PhotoIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import type { TradeEntry } from '@/types/journal';

interface ImageTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onTradeAdded: (trade: TradeEntry) => void;
}

interface AnalyzedData {
  symbol: string;
  timeframe: string;
  date: string;
  time: string;
  direction: string;
  entry: number;
  stopLoss: number;
  slSize: number;
  takeProfit: number;
  status: string;
  rrAchieved: number;
  maxRR: number;
  maxAdverse: string;
  indicators: string[];
  setup: string;
  context: string;
}

export default function ImageTradeModal({
  isOpen,
  onClose,
  accountId,
  onTradeAdded
}: ImageTradeModalProps) {
  const [inputMethod, setInputMethod] = useState<'image' | 'manual' | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const resetModal = () => {
    setInputMethod(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    setAnalyzedData(null);
    setError(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalyzedData(null);

    try {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a PNG, JPEG, GIF, or WebP image');
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Call the analyze-chart API
      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze chart');
      }

      const data = await response.json();
      console.log('AI Analysis Result:', data);
      setAnalyzedData(data);
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to analyze chart image'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveTrade = async () => {
    if (!analyzedData) return;

    setIsSaving(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Calculate additional fields
      const entryPrice = analyzedData.entry;
      const exitPrice =
        analyzedData.status === 'Closed' ? analyzedData.takeProfit : null;
      const pnlAmount =
        analyzedData.status === 'Closed'
          ? analyzedData.direction === 'Long'
            ? analyzedData.takeProfit - analyzedData.entry
            : analyzedData.entry - analyzedData.takeProfit
          : null;

      const pnlPercentage = pnlAmount ? (pnlAmount / entryPrice) * 100 : null;
      const rr = analyzedData.rrAchieved;

      // Parse date and time safely
      const parseDateTime = (dateStr: string, timeStr: string): string => {
        try {
          // Try to parse the date and time
          let dateTimeStr = `${dateStr}T${timeStr}`;

          // If time doesn't have timezone info, assume UTC
          if (
            !timeStr.includes('+') &&
            !timeStr.includes('Z') &&
            !timeStr.includes('-')
          ) {
            dateTimeStr += 'Z';
          }

          const parsedDate = new Date(dateTimeStr);

          // Check if the date is valid
          if (isNaN(parsedDate.getTime())) {
            console.warn(
              'Invalid date format, using current time:',
              dateStr,
              timeStr
            );
            return new Date().toISOString();
          }

          return parsedDate.toISOString();
        } catch (error) {
          console.warn('Date parsing error, using current time:', error);
          return new Date().toISOString();
        }
      };

      const entryDateTime = parseDateTime(analyzedData.date, analyzedData.time);

      // Create trade entry
      const { data, error: insertError } = await supabase
        .from('trade_entries' as any)
        .insert({
          account_id: accountId,
          user_id: user.id,
          symbol: analyzedData.symbol,
          direction: analyzedData.direction.toLowerCase(),
          entry_date: entryDateTime,
          exit_date:
            analyzedData.status === 'Closed' ? new Date().toISOString() : null,
          entry_price: entryPrice,
          exit_price: exitPrice,
          size: 1.0, // Default size, could be made configurable
          pnl: pnlAmount,
          pnl_percentage: pnlPercentage,
          rr: rr,
          status: analyzedData.status.toLowerCase(),
          notes: `Setup: ${analyzedData.setup}\nContext: ${analyzedData.context}\nIndicators: ${analyzedData.indicators.join(', ')}`
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(`Failed to save trade: ${insertError.message}`);
      }

      if (!data) {
        throw new Error('No data returned from database');
      }

      onTradeAdded(data as unknown as TradeEntry);
      setAnalyzedData(null);
      onClose();
    } catch (err) {
      console.error('Error saving trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to save trade');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Add Trade</h2>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {!inputMethod && (
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium text-white mb-6">
                How would you like to add your trade?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setInputMethod('image')}
                  className="flex flex-col items-center p-6 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <PhotoIcon className="h-12 w-12 text-blue-400 mb-3" />
                  <h4 className="text-lg font-medium text-white mb-2">
                    Upload Chart Image
                  </h4>
                  <p className="text-slate-400 text-sm">
                    AI will analyze your chart and extract trade details
                  </p>
                </button>
                <button
                  onClick={() => setInputMethod('manual')}
                  className="flex flex-col items-center p-6 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <CloudArrowUpIcon className="h-12 w-12 text-green-400 mb-3" />
                  <h4 className="text-lg font-medium text-white mb-2">
                    Enter Manually
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Fill in trade details by hand
                  </p>
                </button>
              </div>
            </div>
          )}

          {inputMethod === 'image' && !analyzedData && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setInputMethod(null)}
                  className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Back</span>
                </button>
                <h3 className="text-lg font-medium text-white">
                  Upload Chart Image
                </h3>
                <div></div>
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-900/20'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <h3 className="text-lg font-semibold text-white">
                      Analyzing Chart...
                    </h3>
                    <p className="text-slate-400">
                      Our AI is extracting trade information from your chart
                      image.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CloudArrowUpIcon className="h-16 w-16 text-slate-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Upload Chart Screenshot
                      </h3>
                      <p className="text-slate-400 mb-4">
                        Drag and drop your TradingView chart image here, or
                        click to browse
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Choose File
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Supported formats: PNG, JPEG, GIF, WebP
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {inputMethod === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setInputMethod(null)}
                  className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Back</span>
                </button>
                <h3 className="text-lg font-medium text-white">
                  Enter Trade Details
                </h3>
                <div></div>
              </div>
              <div className="bg-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-center mb-6">
                  Manual entry form coming soon. For now, please use the image
                  upload feature.
                </p>
                <div className="text-center">
                  <button
                    onClick={() => setInputMethod('image')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Switch to Image Upload
                  </button>
                </div>
              </div>
            </div>
          )}

          {analyzedData && (
            <div className="space-y-6">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  ✓ Chart Analysis Complete
                </h3>
                <p className="text-slate-300">
                  AI has successfully extracted trade information from your
                  chart.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-white">
                    Trade Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Symbol:</span>
                      <span className="text-white">{analyzedData.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Direction:</span>
                      <span
                        className={`font-medium ${
                          analyzedData.direction === 'Long'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {analyzedData.direction}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span
                        className={`font-medium ${
                          analyzedData.status === 'Closed'
                            ? 'text-blue-400'
                            : 'text-orange-400'
                        }`}
                      >
                        {analyzedData.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entry Price:</span>
                      <span className="text-white">{analyzedData.entry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stop Loss:</span>
                      <span className="text-red-400">
                        {analyzedData.stopLoss}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Take Profit:</span>
                      <span className="text-green-400">
                        {analyzedData.takeProfit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-white">
                    Performance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">R:R Achieved:</span>
                      <span className="text-white">
                        {analyzedData.rrAchieved}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max R:R:</span>
                      <span className="text-white">{analyzedData.maxRR}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Adverse:</span>
                      <span className="text-orange-400">
                        {analyzedData.maxAdverse}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Timeframe:</span>
                      <span className="text-white">
                        {analyzedData.timeframe}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="text-white">{analyzedData.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time:</span>
                      <span className="text-white">{analyzedData.time}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400">Setup:</span>
                    <p className="text-white">{analyzedData.setup}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Context:</span>
                    <p className="text-white">{analyzedData.context}</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Indicators:</span>
                  <p className="text-white">
                    {analyzedData.indicators.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setAnalyzedData(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Analyze Another
                </button>
                <button
                  onClick={handleSaveTrade}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Trade'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-4 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
