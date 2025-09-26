'use client';

import { useState, useRef, useEffect } from 'react';
import {
  XMarkIcon,
  PhotoIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { Plus, PencilSimple } from '@phosphor-icons/react';
import { createClient } from '@/utils/supabase/client';
import type { TradeEntry } from '@/types/journal';

interface ImageTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    initial_balance: number;
  }>;
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
  pnlAmount: number;
  balance: number;
  risk: number;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<AnalyzedData | null>(null);
  const [manualData, setManualData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entryPrice: '',
    exitPrice: '',
    size: '1',
    status: 'closed' as 'open' | 'closed',
    entryDate: '',
    entryTime: '',
    notes: '',
    pnlAmount: '',
    balance: '',
    risk: ''
  });
  const [calculatedBalance, setCalculatedBalance] = useState<number | null>(
    null
  );
  const [availableTags, setAvailableTags] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);
  const [imageData, setImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Helper function to check if a value couldn't be analyzed
  const isUnanalyzed = (value: any): boolean => {
    return (
      value === 'Could not analyze' ||
      value === '' ||
      value === 0 ||
      value === '0'
    );
  };

  // Helper function to get input styling based on analysis status
  const getInputStyling = (value: any, isRequired: boolean = false) => {
    const baseClasses =
      'w-full px-3 py-2 bg-slate-800/50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500';

    if (isUnanalyzed(value)) {
      return `${baseClasses} border-orange-500/50 bg-orange-900/20 text-orange-200 placeholder-orange-400`;
    }

    return `${baseClasses} border-slate-600/50 text-white`;
  };

  // Fetch tags when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableTags();
    }
  }, [isOpen]);

  // Function to fetch available tags
  const fetchAvailableTags = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }

      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Function to get the most recent trade balance for an account
  const getMostRecentBalance = async (accountId: string) => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: trades, error } = await supabase
        .from('trade_entries')
        .select('balance, created_at')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .not('balance', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching recent balance:', error);
        return null;
      }

      return trades && trades.length > 0 ? trades[0].balance : null;
    } catch (error) {
      console.error('Error getting recent balance:', error);
      return null;
    }
  };

  // Function to calculate balance based on most recent trade or initial balance
  const calculateBalance = async (accountId: string, pnlAmount: number) => {
    const mostRecentBalance = await getMostRecentBalance(accountId);
    const account = accounts.find((acc) => acc.id === accountId);

    if (mostRecentBalance !== null) {
      return mostRecentBalance + pnlAmount;
    } else if (account) {
      return account.initial_balance + pnlAmount;
    }

    return pnlAmount; // Fallback
  };

  // Function to calculate P&L based on most recent trade balance
  const calculatePnL = async (accountId: string, balance: number) => {
    const mostRecentBalance = await getMostRecentBalance(accountId);
    const account = accounts.find((acc) => acc.id === accountId);

    if (mostRecentBalance !== null) {
      return balance - mostRecentBalance;
    } else if (account) {
      return balance - account.initial_balance;
    }

    return balance; // Fallback
  };

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

  const handleManualSubmit = async () => {
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

    // Use P&L amount from manual entry if provided, otherwise calculate from prices
    let pnlAmount = null;
    if (manualData.pnlAmount) {
      pnlAmount = parseFloat(manualData.pnlAmount);
    } else if (manualData.status === 'closed' && exitPrice) {
      pnlAmount =
        manualData.direction === 'long'
          ? (exitPrice - entryPrice) * size
          : (entryPrice - exitPrice) * size;
    }

    // Calculate R:R if we have both entry and exit prices, or use P&L amount
    const rr =
      entryPrice && exitPrice
        ? Math.abs(pnlAmount || 0) / Math.abs(entryPrice - exitPrice)
        : pnlAmount && entryPrice
          ? Math.abs(pnlAmount) / entryPrice
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
      context: manualData.notes || 'Manually entered trade',
      pnlAmount: pnlAmount || 0,
      balance: manualData.balance
        ? parseFloat(manualData.balance)
        : pnlAmount
          ? await calculateBalance(selectedAccounts[0], pnlAmount)
          : 0,
      risk: pnlAmount && rr && rr > 0 ? Math.abs(pnlAmount) / rr : 0
    };

    setAnalyzedData(convertedData);
  };

  const handleAnalyzedDataChange = async (
    field: keyof AnalyzedData,
    value: any
  ) => {
    setAnalyzedData((prev) => {
      if (!prev) return null;

      const updated = { ...prev, [field]: value };

      // Auto-calculate P&L or balance based on what's provided
      if (field === 'pnlAmount' && typeof value === 'number') {
        // For multiple accounts, we'll use the first selected account for now
        const selectedAccount = accounts.find((acc) =>
          selectedAccounts.includes(acc.id)
        );
        if (selectedAccount) {
          // Calculate balance based on most recent trade or initial balance
          calculateBalance(selectedAccount.id, value).then((balance) => {
            setCalculatedBalance(balance);
            setAnalyzedData((prev) => (prev ? { ...prev, balance } : null));
          });
        }
        // Auto-calculate risk: P&L / R:R
        if (updated.rrAchieved && updated.rrAchieved > 0) {
          updated.risk = Math.abs(value) / updated.rrAchieved;
        }
      } else if (field === 'balance' && typeof value === 'number') {
        // When balance is manually entered, calculate P&L based on most recent balance
        const selectedAccount = accounts.find((acc) =>
          selectedAccounts.includes(acc.id)
        );
        if (selectedAccount) {
          calculatePnL(selectedAccount.id, value).then((pnl) => {
            setAnalyzedData((prev) =>
              prev ? { ...prev, pnlAmount: pnl } : null
            );
          });
        }
        // Auto-calculate risk: P&L / R:R
        if (updated.rrAchieved && updated.rrAchieved > 0) {
          updated.risk = Math.abs(updated.pnlAmount) / updated.rrAchieved;
        }
      } else if (field === 'rrAchieved' && typeof value === 'number') {
        // Auto-calculate risk: P&L / R:R
        if (updated.pnlAmount && value > 0) {
          updated.risk = Math.abs(updated.pnlAmount) / value;
        }
      }

      return updated;
    });
  };

  const resetModal = () => {
    setInputMethod(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    setAnalyzedData(null);
    setEditedData(null);
    setIsEditing(false);
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
      notes: '',
      pnlAmount: '',
      balance: '',
      risk: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedData({ ...analyzedData! });
    }
    setIsEditing(!isEditing);
  };

  const handleEditChange = (
    field: keyof AnalyzedData,
    value: string | number | string[]
  ) => {
    if (editedData) {
      setEditedData({
        ...editedData,
        [field]: value
      });
    }
  };

  const handleSaveEdit = () => {
    if (editedData) {
      setAnalyzedData(editedData);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  const handleManualDataChange = (field: string, value: string) => {
    setManualData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate P&L or Balance when one changes
      if (field === 'pnlAmount' && value && selectedAccounts.length > 0) {
        // Get the first selected account's initial balance
        const account = accounts.find((acc) => acc.id === selectedAccounts[0]);
        if (account) {
          const initialBalance = account.initial_balance || 0;
          const pnl = parseFloat(value) || 0;
          updated.balance = (initialBalance + pnl).toString();
        }
      } else if (field === 'balance' && value && selectedAccounts.length > 0) {
        // Get the first selected account's initial balance
        const account = accounts.find((acc) => acc.id === selectedAccounts[0]);
        if (account) {
          const initialBalance = account.initial_balance || 0;
          const balance = parseFloat(value) || 0;
          updated.pnlAmount = (balance - initialBalance).toString();
        }
      }

      return updated;
    });
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

      // Convert file to base64 for storage
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Store the image data for later saving
      setImageData(base64);

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
      const tradeEntries = await Promise.all(
        selectedAccounts.map(async (accountId) => {
          const account = accounts.find((acc) => acc.id === accountId);
          const calculatedBalance =
            analyzedData.balance ||
            (pnlAmount ? await calculateBalance(accountId, pnlAmount) : null);

          return {
            account_id: accountId,
            user_id: user.id,
            symbol: analyzedData.symbol,
            side: analyzedData.direction.toLowerCase(),
            entry_price: entryPrice,
            exit_price: exitPrice,
            pnl_percentage: pnlPercentage,
            pnl_amount: pnlAmount,
            rr: rr,
            size: 1.0, // Default size for AI analyzed trades
            status: analyzedData.status.toLowerCase(),
            entry_date: entryDateTime,
            exit_date:
              analyzedData.status === 'Closed'
                ? new Date().toISOString()
                : null,
            notes: analyzedData.context || '',
            balance: calculatedBalance,
            image_data: imageData // Store the base64 image data
          };
        })
      );

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

                  {/* P&L and Balance Fields */}
                  <div className="pt-4 border-t border-slate-600">
                    <h4 className="text-md font-semibold text-white mb-3">
                      P&L & Balance
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Enter either P&L amount or final balance (the other will
                      be calculated automatically)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          P&L Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualData.pnlAmount}
                          onChange={(e) =>
                            handleManualDataChange('pnlAmount', e.target.value)
                          }
                          placeholder="e.g., 500.00"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Positive for profit, negative for loss
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Final Balance
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualData.balance}
                          onChange={(e) =>
                            handleManualDataChange('balance', e.target.value)
                          }
                          placeholder="e.g., 10500.00"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Account balance after this trade
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Risk Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={manualData.risk}
                            onChange={(e) =>
                              handleManualDataChange('risk', e.target.value)
                            }
                            placeholder="e.g., 100.00"
                            className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Risk amount for this trade
                        </p>
                      </div>
                    </div>
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-semibold text-white">
                      Trade Details
                    </h4>
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
                    >
                      <PencilSimple size={16} weight="bold" />
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Details'}</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Symbol:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.symbol || ''}
                          onChange={(e) =>
                            handleEditChange('symbol', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">
                          {analyzedData.symbol}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Direction:</span>
                      {isEditing ? (
                        <select
                          value={editedData?.direction || ''}
                          onChange={(e) =>
                            handleEditChange('direction', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        >
                          <option value="Long">Long</option>
                          <option value="Short">Short</option>
                        </select>
                      ) : (
                        <span
                          className={`font-medium ${
                            analyzedData.direction === 'Long'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {analyzedData.direction}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      {isEditing ? (
                        <select
                          value={editedData?.status || ''}
                          onChange={(e) =>
                            handleEditChange('status', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        >
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                        </select>
                      ) : (
                        <span
                          className={`font-medium ${
                            analyzedData.status === 'Closed'
                              ? 'text-blue-400'
                              : 'text-orange-400'
                          }`}
                        >
                          {analyzedData.status}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entry Price:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.00001"
                          value={editedData?.entry || ''}
                          onChange={(e) =>
                            handleEditChange(
                              'entry',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">{analyzedData.entry}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stop Loss:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.00001"
                          value={editedData?.stopLoss || ''}
                          onChange={(e) =>
                            handleEditChange(
                              'stopLoss',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-red-400">
                          {analyzedData.stopLoss}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Take Profit:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.00001"
                          value={editedData?.takeProfit || ''}
                          onChange={(e) =>
                            handleEditChange(
                              'takeProfit',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-green-400">
                          {analyzedData.takeProfit || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-white">
                    Performance
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">R:R Achieved:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editedData?.rrAchieved || ''}
                          onChange={(e) =>
                            handleEditChange(
                              'rrAchieved',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">
                          {analyzedData.rrAchieved}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max R:R:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editedData?.maxRR || ''}
                          onChange={(e) =>
                            handleEditChange(
                              'maxRR',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">{analyzedData.maxRR}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Adverse:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.maxAdverse || ''}
                          onChange={(e) =>
                            handleEditChange('maxAdverse', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-orange-400">
                          {analyzedData.maxAdverse}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Timeframe:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData?.timeframe || ''}
                          onChange={(e) =>
                            handleEditChange('timeframe', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">
                          {analyzedData.timeframe}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedData?.date || ''}
                          onChange={(e) =>
                            handleEditChange('date', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">{analyzedData.date}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time:</span>
                      {isEditing ? (
                        <input
                          type="time"
                          value={editedData?.time || ''}
                          onChange={(e) =>
                            handleEditChange('time', e.target.value)
                          }
                          className="w-48 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        />
                      ) : (
                        <span className="text-white">{analyzedData.time}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Notes</h4>
                {isEditing ? (
                  <textarea
                    value={editedData?.context || ''}
                    onChange={(e) =>
                      handleEditChange('context', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Enter trade notes..."
                  />
                ) : (
                  <p className="text-white bg-slate-800 p-3 rounded-lg">
                    {analyzedData.context}
                  </p>
                )}
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
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-400">
                    Chart Analysis Complete
                  </h3>
                </div>
                <p className="text-slate-200 text-sm">
                  AI has successfully extracted trade information from your
                  chart.
                  <span className="text-green-300 font-medium">
                    {' '}
                    You can edit any field below.
                  </span>
                </p>
              </div>

              {/* P&L Highlight Section - Editable */}
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/40 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-blue-400">
                    Trade Performance
                  </h4>
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      analyzedData.pnlAmount && analyzedData.pnlAmount > 0
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : analyzedData.pnlAmount && analyzedData.pnlAmount < 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {analyzedData.pnlAmount && analyzedData.pnlAmount > 0
                      ? 'PROFIT'
                      : analyzedData.pnlAmount && analyzedData.pnlAmount < 0
                        ? 'LOSS'
                        : 'BREAKEVEN'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      P&L Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={analyzedData.pnlAmount || ''}
                      onChange={(e) =>
                        handleAnalyzedDataChange(
                          'pnlAmount',
                          e.target.value === ''
                            ? 0
                            : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Account Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={analyzedData.balance || ''}
                      onChange={(e) =>
                        handleAnalyzedDataChange(
                          'balance',
                          e.target.value === ''
                            ? 0
                            : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      R:R Achieved
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={analyzedData.rrAchieved || ''}
                      onChange={(e) =>
                        setAnalyzedData((prev) =>
                          prev
                            ? {
                                ...prev,
                                rrAchieved:
                                  e.target.value === ''
                                    ? 0
                                    : parseFloat(e.target.value) || 0
                              }
                            : null
                        )
                      }
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Risk Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xl font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          analyzedData.risk ? analyzedData.risk.toFixed(2) : ''
                        }
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  risk: parseFloat(e.target.value) || 0
                                }
                              : null
                          )
                        }
                        className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Auto-calculated: P&L ÷ R:R
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h4 className="text-lg font-semibold text-white">
                      Trade Details
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Symbol
                        {isUnanalyzed(analyzedData.symbol) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={analyzedData.symbol}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev ? { ...prev, symbol: e.target.value } : null
                          )
                        }
                        className={getInputStyling(analyzedData.symbol)}
                        placeholder={
                          isUnanalyzed(analyzedData.symbol)
                            ? 'Enter symbol manually'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Direction
                        {isUnanalyzed(analyzedData.direction) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please select manually)
                          </span>
                        )}
                      </label>
                      <select
                        value={analyzedData.direction}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev ? { ...prev, direction: e.target.value } : null
                          )
                        }
                        className={getInputStyling(analyzedData.direction)}
                      >
                        <option value="Could not analyze">
                          Select Direction
                        </option>
                        <option value="Long">Long</option>
                        <option value="Short">Short</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Status
                        {isUnanalyzed(analyzedData.status) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please select manually)
                          </span>
                        )}
                      </label>
                      <select
                        value={analyzedData.status}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev ? { ...prev, status: e.target.value } : null
                          )
                        }
                        className={getInputStyling(analyzedData.status)}
                      >
                        <option value="Could not analyze">Select Status</option>
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Entry Price
                        {isUnanalyzed(analyzedData.entry) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={analyzedData.entry}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  entry: parseFloat(e.target.value) || 0
                                }
                              : null
                          )
                        }
                        className={getInputStyling(analyzedData.entry)}
                        placeholder={
                          isUnanalyzed(analyzedData.entry)
                            ? 'Enter entry price manually'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Stop Loss
                        {isUnanalyzed(analyzedData.stopLoss) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={analyzedData.stopLoss}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  stopLoss: parseFloat(e.target.value) || 0
                                }
                              : null
                          )
                        }
                        className={getInputStyling(analyzedData.stopLoss)}
                        placeholder={
                          isUnanalyzed(analyzedData.stopLoss)
                            ? 'Enter stop loss manually'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Take Profit
                        {isUnanalyzed(analyzedData.takeProfit) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.00001"
                        value={analyzedData.takeProfit}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  takeProfit: parseFloat(e.target.value) || 0
                                }
                              : null
                          )
                        }
                        className={getInputStyling(analyzedData.takeProfit)}
                        placeholder={
                          isUnanalyzed(analyzedData.takeProfit)
                            ? 'Enter take profit manually'
                            : ''
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <h4 className="text-lg font-semibold text-white">
                      Performance Metrics
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        R:R Achieved
                        {isUnanalyzed(analyzedData.rrAchieved) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={analyzedData.rrAchieved}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  rrAchieved: parseFloat(e.target.value) || 0
                                }
                              : null
                          )
                        }
                        className={getInputStyling(analyzedData.rrAchieved)}
                        placeholder={
                          isUnanalyzed(analyzedData.rrAchieved)
                            ? 'Enter R:R achieved manually'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Max R:R
                        {isUnanalyzed(analyzedData.maxRR) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={analyzedData.maxRR}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  maxRR: parseFloat(e.target.value) || 0
                                }
                              : null
                          )
                        }
                        className={getInputStyling(analyzedData.maxRR)}
                        placeholder={
                          isUnanalyzed(analyzedData.maxRR)
                            ? 'Enter max R:R manually'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Max Adverse
                        {isUnanalyzed(analyzedData.maxAdverse) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={analyzedData.maxAdverse}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev
                              ? { ...prev, maxAdverse: e.target.value }
                              : null
                          )
                        }
                        className={getInputStyling(analyzedData.maxAdverse)}
                        placeholder={
                          isUnanalyzed(analyzedData.maxAdverse)
                            ? 'Enter max adverse manually (e.g., 0.5R)'
                            : 'e.g., 0.5R'
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Timeframe
                        {isUnanalyzed(analyzedData.timeframe) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please enter manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={analyzedData.timeframe}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev ? { ...prev, timeframe: e.target.value } : null
                          )
                        }
                        className={getInputStyling(analyzedData.timeframe)}
                        placeholder={
                          isUnanalyzed(analyzedData.timeframe)
                            ? 'Enter timeframe manually (e.g., 1m, 5m, 1h)'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Date
                        {isUnanalyzed(analyzedData.date) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please select manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={analyzedData.date}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev ? { ...prev, date: e.target.value } : null
                          )
                        }
                        className={getInputStyling(analyzedData.date)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Time
                        {isUnanalyzed(analyzedData.time) && (
                          <span className="text-orange-400 text-xs ml-2">
                            (Could not analyze - please select manually)
                          </span>
                        )}
                      </label>
                      <input
                        type="time"
                        value={analyzedData.time}
                        onChange={(e) =>
                          setAnalyzedData((prev) =>
                            prev ? { ...prev, time: e.target.value } : null
                          )
                        }
                        className={getInputStyling(analyzedData.time)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <h4 className="text-lg font-semibold text-white">
                    Notes & Tags
                  </h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={analyzedData.context}
                      onChange={(e) =>
                        setAnalyzedData((prev) =>
                          prev ? { ...prev, context: e.target.value } : null
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500"
                      rows={3}
                      placeholder="Enter your trade notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tags
                    </label>

                    {/* Available Tags */}
                    {availableTags.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-400 mb-2">
                          Click to add tags:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                const currentTags =
                                  analyzedData?.indicators || [];
                                const isSelected = currentTags.includes(
                                  tag.name
                                );
                                const newTags = isSelected
                                  ? currentTags.filter((t) => t !== tag.name)
                                  : [...currentTags, tag.name];

                                setAnalyzedData((prev) =>
                                  prev ? { ...prev, indicators: newTags } : null
                                );
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                analyzedData?.indicators?.includes(tag.name)
                                  ? `${tag.color} text-white shadow-lg`
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Tag Input */}
                    <input
                      type="text"
                      value={analyzedData?.indicators?.join(', ') || ''}
                      onChange={(e) =>
                        setAnalyzedData((prev) =>
                          prev
                            ? {
                                ...prev,
                                indicators: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                              }
                            : null
                        )
                      }
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-slate-500"
                      placeholder="Or type tags separated by commas..."
                    />
                  </div>
                </div>
              </div>

              {/* Account Selection */}
              <div className="space-y-4 pt-6 border-t border-slate-600">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  <h4 className="text-lg font-semibold text-white">
                    Select Accounts
                  </h4>
                </div>
                <p className="text-sm text-slate-400">
                  Choose which accounts to save this trade to
                </p>

                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={handleSelectAllAccounts}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAllAccounts}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedAccounts.includes(account.id)
                          ? 'border-blue-500 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-lg shadow-blue-500/20'
                          : 'border-slate-600/50 hover:border-slate-500 hover:bg-slate-800/30'
                      }`}
                      onClick={() => handleAccountToggle(account.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            onChange={() => handleAccountToggle(account.id)}
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
                          />
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
                    </div>
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
