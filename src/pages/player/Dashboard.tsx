import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, TrendingUp, DollarSign, Calendar, ExternalLink, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Account {
  id: string;
  type: 'pph' | 'legal';
  username?: string;
  name?: string;
  websiteURL?: string;
  agentName: string;
  status: 'active' | 'inactive';
  depositAmount?: number;
}

interface Entry {
  id: string;
  accountId: string;
  date: string;
  profitLoss: number;
  startingBalance: number;
  endingBalance: number;
}

export default function PlayerDashboard() {
  const { userData } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accountFilter, setAccountFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.uid) {
      fetchPlayerData();
    }
  }, [userData]);

  const fetchPlayerData = async () => {
    try {
      // Fetch assigned accounts
      const accountsQuery = query(collection(db, 'accounts'), where('assignedToPlayerUid', '==', userData?.uid));
      const accountsSnapshot = await getDocs(accountsQuery);
      const accountsData = await Promise.all(
        accountsSnapshot.docs.map(async (accountDoc) => {
          const accountData = accountDoc.data();
          
          // Get agent name
          const agentDoc = await getDocs(query(collection(db, 'agents'), where('__name__', '==', accountData.agentId)));
          const agentName = agentDoc.docs[0]?.data().name || 'Unknown Agent';
          
          return {
            id: accountDoc.id,
            type: accountData.type || 'pph',
            username: accountData.username,
            name: accountData.name,
            websiteURL: accountData.websiteURL,
            agentName,
            status: accountData.status || 'active',
            depositAmount: accountData.depositAmount
          };
        })
      );
      setAccounts(accountsData);

      // Fetch entries for assigned accounts
      if (accountsData.length > 0) {
        const entriesQuery = query(collection(db, 'entries'), where('playerUid', '==', userData?.uid));
        const entriesSnapshot = await getDocs(entriesQuery);
        const entriesData = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Entry[];
        setEntries(entriesData);
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalProfit = entries.reduce((sum, entry) => sum + (entry.profitLoss || 0), 0);
  const activeAccounts = accounts.filter(acc => acc.status === 'active');
  const inactiveAccounts = accounts.filter(acc => acc.status === 'inactive');

  const filteredAccounts = accountFilter === 'all' ? accounts : 
                          accountFilter === 'active' ? activeAccounts : inactiveAccounts;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Player Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Welcome back, {userData?.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Accounts</p>
              <p className="text-2xl font-bold text-cyan-400">{accounts.length}</p>
            </div>
            <CreditCard className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Accounts</p>
              <p className="text-2xl font-bold text-green-400">{activeAccounts.length}</p>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Inactive Accounts</p>
              <p className="text-2xl font-bold text-red-400">{inactiveAccounts.length}</p>
            </div>
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Profit/Loss</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${totalProfit.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Account Filter */}
      <div className="flex items-center space-x-4">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'All Accounts' },
            { key: 'active', label: 'Active Only' },
            { key: 'inactive', label: 'Inactive Only' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setAccountFilter(filter.key as any)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                accountFilter === filter.key
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Accounts */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
        <h2 className="text-xl font-bold text-white mb-6">Your Assigned Accounts</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading accounts...</div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {accountFilter === 'all' 
                ? 'No accounts assigned yet.' 
                : `No ${accountFilter} accounts found.`}
            </p>
            {accountFilter === 'all' && (
              <p className="text-sm text-gray-500 mt-2">Contact your administrator to get accounts assigned.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => (
              <div
                key={account.id}
                className={`backdrop-blur-sm rounded-xl p-6 border hover:scale-105 transition-transform duration-200 ${
                  account.status === 'active'
                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20'
                    : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${
                      account.status === 'active'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}>
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-white">
                          {account.type === 'pph' ? account.username : account.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.type === 'pph' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {account.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">Agent: {account.agentName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {account.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {account.type === 'pph' && account.websiteURL && (
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      <a
                        href={account.websiteURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                      >
                        {account.websiteURL}
                      </a>
                    </div>
                  )}
                  
                  {account.type === 'legal' && account.depositAmount && (
                    <div className="text-sm text-gray-400">
                      Starting Balance: ${account.depositAmount.toLocaleString()}
                    </div>
                  )}
                  
                  <Link
                    to={`/player/account/${account.id}`}
                    className={`block w-full font-medium py-2 px-4 rounded-lg transition-all duration-200 text-center ${
                      account.status === 'active'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white'
                    }`}
                  >
                    {account.status === 'active' ? 'Manage Account' : 'View Account'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Entries */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
        <h2 className="text-xl font-bold text-white mb-6">Recent Entries</h2>
        
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No entries yet.</p>
            <p className="text-sm text-gray-500 mt-2">Start by adding performance data for your assigned accounts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.slice(-5).reverse().map((entry) => {
              const account = accounts.find(acc => acc.id === entry.accountId);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-purple-500/20"
                >
                  <div>
                    <p className="font-medium text-white">
                      {account?.type === 'pph' ? account?.username : account?.name}
                    </p>
                    <p className="text-sm text-gray-400">{entry.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${entry.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${entry.profitLoss.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Balance: ${entry.endingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}