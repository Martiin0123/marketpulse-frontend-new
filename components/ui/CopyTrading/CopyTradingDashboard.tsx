'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface CopyTradingLeader {
  id: string;
  leader_id: string;
  leader_name: string;
  leader_description: string;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  followers_count: number;
  status: string;
  risk_level: string;
  min_copy_amount?: number;
  max_copy_amount?: number;
  copy_fee_percentage: number;
}

interface CopyTradingRelationship {
  id: string;
  leader_id: string;
  follower_id: string;
  copy_amount: number;
  copy_ratio: number;
  risk_level: string;
  status: string;
  total_copied_trades: number;
  total_copied_pnl: number;
  last_copied_at?: string;
  created_at: string;
}

export default function CopyTradingDashboard() {
  const [leaders, setLeaders] = useState<CopyTradingLeader[]>([]);
  const [relationships, setRelationships] = useState<CopyTradingRelationship[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedLeader, setSelectedLeader] =
    useState<CopyTradingLeader | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    leaderId: '',
    copyAmount: '',
    copyRatio: '',
    riskLevel: 'medium'
  });

  useEffect(() => {
    fetchLeaders();
    fetchRelationships();
  }, []);

  const fetchLeaders = async () => {
    try {
      const response = await fetch('/api/bybit/copy-trading');
      const data = await response.json();
      if (response.ok) {
        setLeaders(data.leaders || []);
      }
    } catch (error) {
      console.error('Error fetching leaders:', error);
    }
  };

  const fetchRelationships = async () => {
    try {
      // This would be a separate endpoint to fetch user's relationships
      const response = await fetch('/api/bybit/copy-trading/relationships');
      const data = await response.json();
      if (response.ok) {
        setRelationships(data.relationships || []);
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRelationship = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/bybit/copy-trading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leaderId: formData.leaderId,
          followerId: 'current_user_id', // Replace with actual user ID
          copyAmount: parseFloat(formData.copyAmount),
          copyRatio: parseFloat(formData.copyRatio),
          riskLevel: formData.riskLevel
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Copy trading relationship created successfully!');
        setShowCreateForm(false);
        setFormData({
          leaderId: '',
          copyAmount: '',
          copyRatio: '',
          riskLevel: 'medium'
        });
        fetchRelationships();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating relationship:', error);
      alert('Error creating copy trading relationship');
    }
  };

  const updateRelationship = async (relationshipId: string, updates: any) => {
    try {
      const response = await fetch('/api/bybit/copy-trading', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          relationshipId,
          ...updates
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Relationship updated successfully!');
        fetchRelationships();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating relationship:', error);
      alert('Error updating relationship');
    }
  };

  const deleteRelationship = async (relationshipId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this copy trading relationship?'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/bybit/copy-trading?relationshipId=${relationshipId}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert('Relationship deleted successfully!');
        fetchRelationships();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting relationship:', error);
      alert('Error deleting relationship');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading copy trading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Copy Trading Dashboard</h1>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create New Relationship'}
        </Button>
      </div>

      {/* Create Relationship Form */}
      {showCreateForm && (
        <Card title="Create Copy Trading Relationship" className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Create Copy Trading Relationship
          </h2>
          <form onSubmit={createRelationship} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Leader ID
                </label>
                <Input
                  type="text"
                  value={formData.leaderId}
                  onChange={(value: string) =>
                    setFormData({ ...formData, leaderId: value })
                  }
                  placeholder="Enter leader ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Copy Amount (USD)
                </label>
                <Input
                  type="number"
                  value={formData.copyAmount}
                  onChange={(value: string) =>
                    setFormData({ ...formData, copyAmount: value })
                  }
                  placeholder="1000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Copy Ratio
                </label>
                <Input
                  type="number"
                  value={formData.copyRatio}
                  onChange={(value: string) =>
                    setFormData({ ...formData, copyRatio: value })
                  }
                  placeholder="0.5"
                  min="0"
                  max="1"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Risk Level
                </label>
                <select
                  value={formData.riskLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, riskLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Create Relationship
              </Button>
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Available Leaders */}
      <Card title="Available Leaders" className="p-6">
        <h2 className="text-xl font-semibold mb-4">Available Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaders.map((leader) => (
            <div
              key={leader.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{leader.leader_name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    leader.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {leader.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {leader.leader_description}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total PnL:</span>
                  <span
                    className={
                      leader.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {formatCurrency(leader.total_pnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span>{formatPercentage(leader.win_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span>{leader.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span>Followers:</span>
                  <span>{leader.followers_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Risk Level:</span>
                  <span className="capitalize">{leader.risk_level}</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedLeader(leader);
                  setFormData({ ...formData, leaderId: leader.leader_id });
                  setShowCreateForm(true);
                }}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              >
                Copy This Leader
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Relationships */}
      <Card title="Your Copy Trading Relationships" className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Your Copy Trading Relationships
        </h2>
        {relationships.length === 0 ? (
          <p className="text-gray-500">No active copy trading relationships.</p>
        ) : (
          <div className="space-y-4">
            {relationships.map((relationship) => (
              <div key={relationship.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Leader: {relationship.leader_id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Created:{' '}
                      {new Date(relationship.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      relationship.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {relationship.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Copy Amount:</span>
                    <p>{formatCurrency(relationship.copy_amount)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Copy Ratio:</span>
                    <p>{formatPercentage(relationship.copy_ratio * 100)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Copied Trades:</span>
                    <p>{relationship.total_copied_trades}</p>
                  </div>
                  <div>
                    <span className="font-medium">Total PnL:</span>
                    <p
                      className={
                        relationship.total_copied_pnl >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatCurrency(relationship.total_copied_pnl)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() =>
                      updateRelationship(relationship.id, { status: 'paused' })
                    }
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Pause
                  </Button>
                  <Button
                    onClick={() =>
                      updateRelationship(relationship.id, { status: 'active' })
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Resume
                  </Button>
                  <Button
                    onClick={() => deleteRelationship(relationship.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
