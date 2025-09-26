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
  accounts: Array<{ id: string; name: string; currency: string }>;
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
  accounts,
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
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [manualData, setManualData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entryPrice: '',
    exitPrice: '',
    size: '1',
    status: 'closed' as 'open' | 'closed',
    entryDate: '',
    entryTime: '',
    notes: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAllAccounts = () => {
    setSelectedAccounts(accounts.map((account) => account.id));
  };

  const handleDeselectAllAccounts = () => {
    setSelectedAccounts([]);
  };

  const handleManualSubmit = () => {
    // Validate required fields
    if (
      !manualData.symbol ||
      !manualData.entryPrice ||
      !manualData.entryDate ||
      !manualData.entryTime
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedAccounts.length === 0) {
      setError('Please select at least one account');
      return;
    }

    // Convert manual data to analyzed data format for consistency
    const entryPrice = parseFloat(manualData.entryPrice);
    const exitPrice = manualData.exitPrice
      ? parseFloat(manualData.exitPrice)
      : null;
    const size = parseFloat(manualData.size);

    // Calculate P&L if trade is closed
    let pnlAmount = null;
    if (manualData.status === 'closed' && exitPrice) {
      pnlAmount =
        manualData.direction === 'long'
          ? (exitPrice - entryPrice) * size
          : (entryPrice - exitPrice) * size;
    }

    // Calculate R:R if we have both entry and exit prices
    const rr =
      entryPrice && exitPrice
        ? Math.abs(pnlAmount || 0) / Math.abs(entryPrice - exitPrice)
        : null;

    const convertedData: AnalyzedData = {
      symbol: manualData.symbol,
      timeframe: 'Manual Entry',
      date: manualData.entryDate,
      time: manualData.entryTime,
      direction: manualData.direction === 'long' ? 'Long' : 'Short',
      entry: entryPrice,
      stopLoss: 0, // Not provided in manual entry
      slSize: size,
      takeProfit: exitPrice || 0,
      status: manualData.status === 'closed' ? 'Closed' : 'Open',
      rrAchieved: rr || 0,
      maxRR: rr || 0,
      maxAdverse: 'N/A',
      indicators: ['Manual Entry'],
      setup: 'Manual Entry',
      context: manualData.notes || 'Manually entered trade'
    };

    setAnalyzedData(convertedData);
  };

  const resetModal = () => {
    setInputMethod(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    setAnalyzedData(null);
    setError(null);
    setDragActive(false);
    setSelectedAccounts([]);
    setManualData({
      symbol: '',
      direction: 'long',
      entryPrice: '',
      exitPrice: '',
      size: '1',
      status: 'closed',
      entryDate: '',
      entryTime: '',
      notes: ''
    });
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
    if (!analyzedData || selectedAccounts.length === 0) {
      setError('Please select at least one account');
      return;
    }

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

      // Create trade entries for all selected accounts
      const tradeEntries = selectedAccounts.map((accountId) => ({
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
      }));

      const { data, error: insertError } = await supabase
        .from('trade_entries' as any)
        .insert(tradeEntries)
        .select();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(`Failed to save trade: ${insertError.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from database');
      }

      // Call onTradeAdded for each created trade
      data.forEach((trade: any) => {
        onTradeAdded(trade as unknown as TradeEntry);
      });

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

          {inputMethod === 'manual' && !analyzedData && (
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleManualSubmit();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Symbol *
                      </label>
                      <input
                        type="text"
                        value={manualData.symbol}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            symbol: e.target.value
                          }))
                        }
                        placeholder="e.g., BTCUSD, EURUSD"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Direction *
                      </label>
                      <select
                        value={manualData.direction}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            direction: e.target.value as 'long' | 'short'
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Entry Price *
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={manualData.entryPrice}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            entryPrice: e.target.value
                          }))
                        }
                        placeholder="e.g., 50000.00"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Exit Price
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={manualData.exitPrice}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            exitPrice: e.target.value
                          }))
                        }
                        placeholder="e.g., 51000.00"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Size
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualData.size}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            size: e.target.value
                          }))
                        }
                        placeholder="e.g., 1.0"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Status
                      </label>
                      <select
                        value={manualData.status}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            status: e.target.value as 'open' | 'closed'
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Entry Date *
                      </label>
                      <input
                        type="date"
                        value={manualData.entryDate}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            entryDate: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Entry Time *
                      </label>
                      <input
                        type="time"
                        value={manualData.entryTime}
                        onChange={(e) =>
                          setManualData((prev) => ({
                            ...prev,
                            entryTime: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={manualData.notes}
                      onChange={(e) =>
                        setManualData((prev) => ({
                          ...prev,
                          notes: e.target.value
                        }))
                      }
                      placeholder="Additional notes about this trade..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Account Selection */}
                  <div className="pt-4 border-t border-slate-600">
                    <h4 className="text-md font-semibold text-white mb-3">
                      Select Accounts
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Choose which accounts this trade should be logged to:
                    </p>

                    <div className="flex space-x-2 mb-4">
                      <button
                        type="button"
                        onClick={handleSelectAllAccounts}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllAccounts}
                        className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {accounts.map((account) => (
                        <label
                          key={account.id}
                          className="flex items-center space-x-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            onChange={() => handleAccountToggle(account.id)}
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">
                              {account.name}
                            </div>
                            <div className="text-sm text-slate-400">
                              {account.currency}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {selectedAccounts.length === 0 && (
                      <p className="text-sm text-red-400 mb-4">
                        Please select at least one account to save the trade.
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setInputMethod(null)}
                      className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Continue to Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {inputMethod === 'manual' && analyzedData && (
            <div className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  ✓ Manual Entry Complete
                </h3>
                <p className="text-slate-300">
                  Review your trade details before saving.
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
                      <span className="text-slate-400">Exit Price:</span>
                      <span className="text-green-400">
                        {analyzedData.takeProfit || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-white">
                    Additional Info
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Size:</span>
                      <span className="text-white">{analyzedData.slSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="text-white">{analyzedData.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time:</span>
                      <span className="text-white">{analyzedData.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">R:R:</span>
                      <span className="text-white">
                        {analyzedData.rrAchieved}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Notes</h4>
                <p className="text-white bg-slate-800 p-3 rounded-lg">
                  {analyzedData.context}
                </p>
              </div>

              {/* Account Selection */}
              <div className="space-y-4 pt-4 border-t border-slate-600">
                <h4 className="text-md font-semibold text-white">
                  Selected Accounts
                </h4>
                <p className="text-sm text-slate-400">
                  This trade will be logged to the following accounts:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedAccounts.map((accountId) => {
                    const account = accounts.find(
                      (acc) => acc.id === accountId
                    );
                    return account ? (
                      <div
                        key={accountId}
                        className="flex items-center space-x-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg"
                      >
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-2 h-2 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">
                            {account.name}
                          </div>
                          <div className="text-sm text-slate-400">
                            {account.currency}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>

                {selectedAccounts.length === 0 && (
                  <p className="text-sm text-red-400">
                    Please select at least one account to save the trade.
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setAnalyzedData(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Edit Details
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

          {inputMethod === 'image' && analyzedData && (
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

              {/* Account Selection */}
              <div className="space-y-4 pt-4 border-t border-slate-600">
                <h4 className="text-md font-semibold text-white">
                  Select Accounts
                </h4>
                <p className="text-sm text-slate-400">
                  Choose which accounts this trade should be logged to:
                </p>

                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={handleSelectAllAccounts}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAllAccounts}
                    className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className="flex items-center space-x-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={() => handleAccountToggle(account.id)}
                        className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {account.name}
                        </div>
                        <div className="text-sm text-slate-400">
                          {account.currency}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedAccounts.length === 0 && (
                  <p className="text-sm text-red-400">
                    Please select at least one account to save the trade.
                  </p>
                )}
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
