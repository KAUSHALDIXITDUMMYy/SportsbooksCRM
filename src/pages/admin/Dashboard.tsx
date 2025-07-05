import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, CreditCard, UserPlus, TrendingUp, Calendar, Filter, BarChart3, Eye } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DashboardStats {
  totalAgents: number;
  totalAccounts: number;
  totalPlayers: number;
  totalTransactions: number;
  totalProfit: number;
  activeAccounts: number;
  inactiveAccounts: number;
}

interface AgentStats {
  id: string;
  name: string;
  accountCount: number;
  playerCount: number;
  totalProfit: number;
  commissionPercentage: number;
}

interface PlayerStats {
  uid: string;
  name: string;
  email: string;
  accountCount: number;
  totalProfit: number;
  totalEntries: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    totalAccounts: 0,
    totalPlayers: 0,
    totalTransactions: 0,
    totalProfit: 0,
    activeAccounts: 0,
    inactiveAccounts: 0
  });
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [viewMode, setViewMode] = useState<'overview' | 'agents' | 'players'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [dateFilter]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get date range for filtering
      const { startDate, endDate } = getDateRange();

      // Fetch agents
      const agentsSnapshot = await getDocs(collection(db, 'agents'));
      const totalAgents = agentsSnapshot.size;
      const agents = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch accounts
      const accountsSnapshot = await getDocs(collection(db, 'accounts'));
      const totalAccounts = accountsSnapshot.size;
      const accounts = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
      const inactiveAccounts = accounts.filter(acc => acc.status === 'inactive').length;

      // Fetch players
      const playersQuery = query(collection(db, 'users'), where('role', '==', 'player'));
      const playersSnapshot = await getDocs(playersQuery);
      const totalPlayers = playersSnapshot.size;
      const players = playersSnapshot.docs.map(doc => ({
        uid: doc.data().uid,
        ...doc.data()
      }));

      // Fetch entries for the selected date range
      const entriesQuery = query(
        collection(db, 'entries'),
        where('date', '>=', format(startDate, 'yyyy-MM-dd')),
        where('date', '<=', format(endDate, 'yyyy-MM-dd')),
        orderBy('date', 'desc')
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      const totalTransactions = entriesSnapshot.size;
      const entries = entriesSnapshot.docs.map(doc => doc.data());

      // Calculate total profit
      let totalProfit = 0;
      entries.forEach((entry) => {
        totalProfit += entry.profitLoss || 0;
      });

      // Calculate agent stats
      const agentStatsData: AgentStats[] = await Promise.all(
        agents.map(async (agent) => {
          const agentAccounts = accounts.filter(acc => acc.agentId === agent.id);
          const assignedPlayerUids = [...new Set(agentAccounts.map(acc => acc.assignedToPlayerUid).filter(Boolean))];
          
          // Calculate profit for this agent's accounts
          const agentEntries = entries.filter(entry => 
            agentAccounts.some(acc => acc.id === entry.accountId)
          );
          const agentProfit = agentEntries.reduce((sum, entry) => sum + (entry.profitLoss || 0), 0);

          return {
            id: agent.id,
            name: agent.name,
            accountCount: agentAccounts.length,
            playerCount: assignedPlayerUids.length,
            totalProfit: agentProfit,
            commissionPercentage: agent.commissionPercentage || 0
          };
        })
      );

      // Calculate player stats
      const playerStatsData: PlayerStats[] = await Promise.all(
        players.map(async (player) => {
          const playerAccounts = accounts.filter(acc => acc.assignedToPlayerUid === player.uid);
          const playerEntries = entries.filter(entry => entry.playerUid === player.uid);
          const playerProfit = playerEntries.reduce((sum, entry) => sum + (entry.profitLoss || 0), 0);

          return {
            uid: player.uid,
            name: player.name,
            email: player.email,
            accountCount: playerAccounts.length,
            totalProfit: playerProfit,
            totalEntries: playerEntries.length
          };
        })
      );

      setStats({
        totalAgents,
        totalAccounts,
        totalPlayers,
        totalTransactions,
        totalProfit,
        activeAccounts,
        inactiveAccounts
      });
      setAgentStats(agentStatsData);
      setPlayerStats(playerStatsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'week':
        return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
      case 'month':
        return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
      default:
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
    }
  };

  const statCards = [
    {
      title: 'Total Agents',
      value: stats.totalAgents,
      icon: Users,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10'
    },
    {
      title: 'Total Accounts',
      value: stats.totalAccounts,
      icon: CreditCard,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Active Accounts',
      value: stats.activeAccounts,
      icon: BarChart3,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Total Players',
      value: stats.totalPlayers,
      icon: UserPlus,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Monitor your sportsbookcrm.com platform performance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white/5 border border-purple-500/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex space-x-4">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'agents', label: 'Agent Dashboard', icon: Users },
          { key: 'players', label: 'Player Dashboard', icon: UserPlus }
        ].map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === mode.key
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`${card.bgColor} backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:scale-105 transition-transform duration-200`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {loading ? '...' : card.value.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">{card.title}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Profit/Loss Summary */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Profit/Loss Summary</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
                <p className="text-sm text-gray-400">Total Profit/Loss</p>
                <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {loading ? '...' : `$${stats.totalProfit.toLocaleString()}`}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/20">
                <p className="text-sm text-gray-400">Avg Per Transaction</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {loading ? '...' : `$${stats.totalTransactions > 0 ? (stats.totalProfit / stats.totalTransactions).toFixed(2) : '0.00'}`}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
                <p className="text-sm text-gray-400">Account Utilization</p>
                <p className="text-2xl font-bold text-purple-400">
                  {loading ? '...' : `${stats.totalAccounts > 0 ? ((stats.activeAccounts / stats.totalAccounts) * 100).toFixed(1) : '0'}%`}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'agents' && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Agent Performance Dashboard
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Loading agent data...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {agentStats.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg p-4 border border-cyan-500/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                      <p className="text-sm text-gray-400">Commission: {agent.commissionPercentage}%</p>
                    </div>
                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-sm text-gray-400">Accounts</p>
                        <p className="text-xl font-bold text-cyan-400">{agent.accountCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Players</p>
                        <p className="text-xl font-bold text-purple-400">{agent.playerCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Total Profit</p>
                        <p className={`text-xl font-bold ${agent.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${agent.totalProfit.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Commission Earned</p>
                        <p className="text-xl font-bold text-yellow-400">
                          ${((agent.totalProfit * agent.commissionPercentage) / 100).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'players' && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <UserPlus className="w-6 h-6 mr-2" />
            Player Performance Dashboard
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Loading player data...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {playerStats.map((player) => (
                <div
                  key={player.uid}
                  className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{player.name}</h3>
                      <p className="text-sm text-gray-400">{player.email}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-sm text-gray-400">Assigned Accounts</p>
                        <p className="text-xl font-bold text-cyan-400">{player.accountCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Total Entries</p>
                        <p className="text-xl font-bold text-purple-400">{player.totalEntries}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Total Profit</p>
                        <p className={`text-xl font-bold ${player.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${player.totalProfit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
        <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
            Add New Agent
          </button>
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
            Create Account
          </button>
          <button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
            Add Player
          </button>
          <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}