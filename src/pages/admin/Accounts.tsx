import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, CreditCard, Trash2, Edit, ExternalLink, Save, X, BarChart3, Search, Filter, Lock, User } from 'lucide-react';

interface Account {
  id: string;
  type: 'pph' | 'legal';
  username?: string;
  websiteURL?: string;
  password?: string;
  deal?: string;
  ip?: string;
  name?: string;
  sharePercentage?: number;
  depositAmount?: number;
  agentId: string;
  agentName: string;
  assignedToPlayerUid?: string;
  assignedToPlayerName?: string;
  status: 'active' | 'inactive' | 'unused' | 'locked';
  createdAt: Date;
  referralPercentage?: number;
}

interface Agent {
  id: string;
  name: string;
  accountCount: number;
}

interface Player {
  id: string;
  uid: string;
  name: string;
  email: string;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newAccount, setNewAccount] = useState({
    type: 'pph' as 'pph' | 'legal',
    username: '',
    websiteURL: '',
    password: '',
    deal: '',
    ip: '',
    name: '',
    sharePercentage: '',
    depositAmount: '',
    agentId: '',
    assignedToPlayerUid: '',
    status: 'active' as 'active' | 'inactive' | 'unused' | 'locked',
    referralPercentage: ''
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'unused' | 'locked' | 'pph' | 'legal'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchAgents();
    fetchPlayers();
  }, []);

  useEffect(() => {
    let filtered = accounts;
    
    if (searchTerm) {
      filtered = filtered.filter(account => {
        const searchableText = `${account.type === 'pph' ? account.username : account.name} ${account.agentName} ${account.assignedToPlayerName || ''}`.toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      });
    }
    
    if (filter !== 'all') {
      if (filter === 'active' || filter === 'inactive' || filter === 'unused' || filter === 'locked') {
        filtered = filtered.filter(account => account.status === filter);
      } else if (filter === 'pph' || filter === 'legal') {
        filtered = filtered.filter(account => account.type === filter);
      }
    }
    
    if (agentFilter !== 'all') {
      filtered = filtered.filter(account => account.agentId === agentFilter);
    }
    
    setFilteredAccounts(filtered);
  }, [accounts, searchTerm, filter, agentFilter]);

  const handleSummaryCardClick = (filterType: 'all' | 'active' | 'inactive' | 'unused' | 'locked' | 'pph' | 'legal') => {
    setFilter(filterType);
    // Scroll to the filter section for better UX on mobile
    document.getElementById('accounts-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAccounts = async () => {
    try {
      const accountsSnapshot = await getDocs(collection(db, 'accounts'));
      const accountsData = await Promise.all(
        accountsSnapshot.docs.map(async (accountDoc) => {
          const accountData = accountDoc.data();
          
          const agentDoc = await getDocs(query(collection(db, 'agents'), where('__name__', '==', accountData.agentId)));
          const agentName = agentDoc.docs[0]?.data().name || 'Unknown Agent';
          
          let assignedToPlayerName = '';
          if (accountData.assignedToPlayerUid) {
            const playerDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', accountData.assignedToPlayerUid)));
            assignedToPlayerName = playerDoc.docs[0]?.data().name || 'Unknown Player';
          }
          
          const entriesQuery = query(collection(db, 'entries'), where('accountId', '==', accountDoc.id));
          const entriesSnapshot = await getDocs(entriesQuery);
          
          let status = accountData.status || 'unused';
          if (entriesSnapshot.size === 0 || !accountData.assignedToPlayerUid) {
            status = 'unused';
          } else if (status === 'unused') {
            status = 'active';
            await updateDoc(doc(db, 'accounts', accountDoc.id), {
              status: 'active',
              updatedAt: new Date()
            });
          }
          
          return {
            id: accountDoc.id,
            ...accountData,
            type: accountData.type || 'pph',
            status,
            agentName,
            assignedToPlayerName,
            createdAt: accountData.createdAt?.toDate() || new Date()
          };
        })
      ) as Account[];
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const accountsSnapshot = await getDocs(collection(db, 'accounts'));
      const accountCounts: Record<string, number> = {};
      
      accountsSnapshot.forEach(doc => {
        const agentId = doc.data().agentId;
        accountCounts[agentId] = (accountCounts[agentId] || 0) + 1;
      });

      const agentsSnapshot = await getDocs(collection(db, 'agents'));
      const agentsData = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        accountCount: accountCounts[doc.id] || 0
      })).sort((a, b) => b.accountCount - a.accountCount);
      
      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const playersQuery = query(collection(db, 'users'), where('role', '==', 'player'));
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.data().uid,
        name: doc.data().name,
        email: doc.data().email
      })) as Player[];
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.agentId) return;

    const accountData: any = {
      type: newAccount.type,
      agentId: newAccount.agentId,
      status: newAccount.status,
      createdAt: new Date()
    };

    if (newAccount.assignedToPlayerUid) {
      accountData.assignedToPlayerUid = newAccount.assignedToPlayerUid;
      accountData.status = 'active'; // Automatically set to active when assigned
    }

    if (newAccount.type === 'pph') {
      if (!newAccount.username || !newAccount.websiteURL || !newAccount.password) return;
      accountData.username = newAccount.username.trim();
      accountData.websiteURL = newAccount.websiteURL.trim();
      accountData.password = newAccount.password.trim();
      accountData.deal = newAccount.deal.trim();
      accountData.ip = newAccount.ip.trim();
    } else {
      if (!newAccount.name) return;
      accountData.name = newAccount.name.trim();
      accountData.sharePercentage = parseFloat(newAccount.sharePercentage) || 0;
      accountData.depositAmount = parseFloat(newAccount.depositAmount) || 0;
    }

    if (newAccount.referralPercentage) {
      accountData.referralPercentage = parseFloat(newAccount.referralPercentage);
    }

    try {
      await addDoc(collection(db, 'accounts'), accountData);
      setNewAccount({
        type: 'pph',
        username: '',
        websiteURL: '',
        password: '',
        deal: '',
        ip: '',
        name: '',
        sharePercentage: '',
        depositAmount: '',
        agentId: '',
        assignedToPlayerUid: '',
        status: 'active',
        referralPercentage: ''
      });
      setShowModal(false);
      fetchAccounts();
      fetchAgents();
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const updateData: any = {
      type: editingAccount.type,
      agentId: editingAccount.agentId,
      status: editingAccount.status,
      updatedAt: new Date()
    };

    if (editingAccount.referralPercentage !== undefined) {
      updateData.referralPercentage = Number(editingAccount.referralPercentage);
    }

    if (editingAccount.type === 'pph') {
      updateData.username = editingAccount.username?.trim();
      updateData.websiteURL = editingAccount.websiteURL?.trim();
      updateData.password = editingAccount.password?.trim();
      updateData.deal = editingAccount.deal?.trim();
      updateData.ip = editingAccount.ip?.trim();
    } else {
      updateData.name = editingAccount.name?.trim();
      updateData.sharePercentage = editingAccount.sharePercentage;
      updateData.depositAmount = editingAccount.depositAmount;
    }

    try {
      await updateDoc(doc(db, 'accounts', editingAccount.id), updateData);
      setEditingAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteDoc(doc(db, 'accounts', accountId));
        fetchAccounts();
        fetchAgents();
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const accountStats = {
    total: accounts.length,
    active: accounts.filter(a => a.status === 'active').length,
    inactive: accounts.filter(a => a.status === 'inactive').length,
    unused: accounts.filter(a => a.status === 'unused').length,
    locked: accounts.filter(a => a.status === 'locked').length,
    pph: accounts.filter(a => a.type === 'pph').length,
    legal: accounts.filter(a => a.type === 'legal').length,
    assigned: accounts.filter(a => a.assignedToPlayerUid).length
  };

  const dropdownArrowSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;

  return (
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Accounts Management
          </h1>
          <p className="text-gray-400 text-sm md:text-base">Manage trading accounts and credentials</p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium py-2 px-4 md:py-3 md:px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span>Add New Account</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 md:gap-4">
        <div 
          onClick={() => handleSummaryCardClick('all')}
          className={`bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-blue-500/20 cursor-pointer transition-all duration-200 hover:border-blue-500/40 ${
            filter === 'all' ? 'ring-2 ring-blue-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Total</p>
              <p className="text-lg md:text-2xl font-bold text-blue-400">{accountStats.total}</p>
            </div>
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          </div>
        </div>
        <div 
          onClick={() => handleSummaryCardClick('active')}
          className={`bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-green-500/20 cursor-pointer transition-all duration-200 hover:border-green-500/40 ${
            filter === 'active' ? 'ring-2 ring-green-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Active</p>
              <p className="text-lg md:text-2xl font-bold text-green-400">{accountStats.active}</p>
            </div>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 rounded-full"></div>
          </div>
        </div>
        <div 
          onClick={() => handleSummaryCardClick('inactive')}
          className={`bg-gradient-to-r from-red-500/10 to-pink-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-red-500/20 cursor-pointer transition-all duration-200 hover:border-red-500/40 ${
            filter === 'inactive' ? 'ring-2 ring-red-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Inactive</p>
              <p className="text-lg md:text-2xl font-bold text-red-400">{accountStats.inactive}</p>
            </div>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full"></div>
          </div>
        </div>
        <div 
          onClick={() => handleSummaryCardClick('pph')}
          className={`bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-purple-500/20 cursor-pointer transition-all duration-200 hover:border-purple-500/40 ${
            filter === 'pph' ? 'ring-2 ring-purple-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">PPH</p>
              <p className="text-lg md:text-2xl font-bold text-purple-400">{accountStats.pph}</p>
            </div>
            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
          </div>
        </div>
        <div 
          onClick={() => handleSummaryCardClick('legal')}
          className={`bg-gradient-to-r from-orange-500/10 to-yellow-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-orange-500/20 cursor-pointer transition-all duration-200 hover:border-orange-500/40 ${
            filter === 'legal' ? 'ring-2 ring-orange-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Legal</p>
              <p className="text-lg md:text-2xl font-bold text-orange-400">{accountStats.legal}</p>
            </div>
            <div className="w-5 h-5 md:w-6 md:h-6 bg-gradient-to-r from-orange-400 to-yellow-400 rounded"></div>
          </div>
        </div>
        <div 
          onClick={() => handleSummaryCardClick('unused')}
          className={`bg-gradient-to-r from-yellow-500/10 to-amber-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-yellow-500/20 cursor-pointer transition-all duration-200 hover:border-yellow-500/40 ${
            filter === 'unused' ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Unused</p>
              <p className="text-lg md:text-2xl font-bold text-yellow-400">{accountStats.unused}</p>
            </div>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full"></div>
          </div>
        </div>
        <div 
          onClick={() => handleSummaryCardClick('locked')}
          className={`bg-gradient-to-r from-gray-500/10 to-gray-700/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-gray-500/20 cursor-pointer transition-all duration-200 hover:border-gray-500/40 ${
            filter === 'locked' ? 'ring-2 ring-gray-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Locked</p>
              <p className="text-lg md:text-2xl font-bold text-gray-400">{accountStats.locked}</p>
            </div>
            <Lock className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Assigned</p>
              <p className="text-lg md:text-2xl font-bold text-cyan-400">{accountStats.assigned}</p>
            </div>
            <User className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      <div id="accounts-section" className="flex flex-col gap-2 md:gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={agentFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAgentFilter(e.target.value)}
              className="appearance-none w-full pl-10 pr-8 py-2 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center] text-sm md:text-base"
              style={{ backgroundImage: dropdownArrowSvg }}
            >
              <option value="all" className="bg-gray-800 text-white">All Holders</option>
              {agents.map((agent) => (
                <option 
                  key={agent.id} 
                  value={agent.id}
                  className="bg-gray-800 text-white hover:bg-cyan-500"
                >
                  {isMobile ? agent.name.split(' ')[0] : agent.name} ({agent.accountCount})
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <select
              value={filter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as any)}
              className="appearance-none w-full pl-10 pr-8 py-2 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center] text-sm md:text-base"
              style={{ backgroundImage: dropdownArrowSvg }}
            >
              <option value="all" className="bg-gray-800 text-white">All Status</option>
              <option value="active" className="bg-gray-800 text-white">Active</option>
              <option value="inactive" className="bg-gray-800 text-white">Inactive</option>
              <option value="unused" className="bg-gray-800 text-white">Unused</option>
              <option value="locked" className="bg-gray-800 text-white">Locked</option>
              <option value="pph" className="bg-gray-800 text-white">PPH</option>
              <option value="legal" className="bg-gray-800 text-white">Legal</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 md:py-12">
            <div className="text-gray-400">Loading accounts...</div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="col-span-full text-center py-8 md:py-12">
            <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
            <p className="text-gray-400 text-sm md:text-base">
              {searchTerm || filter !== 'all' || agentFilter !== 'all' 
                ? 'No matching accounts found' 
                : 'No accounts found. Create your first account!'}
            </p>
          </div>
        ) : (
          filteredAccounts.map((account) => (
            <div
              key={account.id}
              className={`bg-black/20 backdrop-blur-sm rounded-lg md:rounded-xl p-4 md:p-6 border transition-transform duration-200 ${
                account.status === 'active' ? 'border-green-500/20 hover:border-green-500/40' :
                account.status === 'inactive' ? 'border-red-500/20 hover:border-red-500/40' :
                account.status === 'unused' ? 'border-yellow-500/20 hover:border-yellow-500/40' :
                'border-gray-500/20 hover:border-gray-500/40'
              } hover:scale-[1.02] md:hover:scale-105`}
            >
              {editingAccount?.id === account.id ? (
                <form onSubmit={handleEditAccount} className="space-y-3 md:space-y-4">
                  <div className="flex items-center space-x-2 mb-3 md:mb-4">
                    <select
                      value={editingAccount.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        setEditingAccount({ ...editingAccount, type: e.target.value as 'pph' | 'legal' })
                      }
                      className="appearance-none px-2 py-1 md:px-3 md:py-1 bg-white/5 border border-purple-500/20 rounded text-white text-xs md:text-sm pr-6 md:pr-8 bg-no-repeat bg-[length:20px_20px] bg-[position:right_2px_center]"
                      style={{ backgroundImage: dropdownArrowSvg }}
                    >
                      <option value="pph" className="bg-gray-800 text-white">PPH</option>
                      <option value="legal" className="bg-gray-800 text-white">Legal</option>
                    </select>
                    <select
                      value={editingAccount.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        setEditingAccount({ ...editingAccount, status: e.target.value as 'active' | 'inactive' | 'unused' | 'locked' })
                      }
                      className="appearance-none px-2 py-1 md:px-3 md:py-1 bg-white/5 border border-purple-500/20 rounded text-white text-xs md:text-sm pr-6 md:pr-8 bg-no-repeat bg-[length:20px_20px] bg-[position:right_2px_center]"
                      style={{ backgroundImage: dropdownArrowSvg }}
                    >
                      <option value="active" className="bg-gray-800 text-white">Active</option>
                      <option value="inactive" className="bg-gray-800 text-white">Inactive</option>
                      <option value="unused" className="bg-gray-800 text-white">Unused</option>
                      <option value="locked" className="bg-gray-800 text-white">Locked</option>
                    </select>
                  </div>

                  {editingAccount.type === 'pph' ? (
                    <>
                      <input
                        type="text"
                        value={editingAccount.username || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, username: e.target.value })}
                        placeholder="Username"
                        className="w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                      />
                      <input
                        type="url"
                        value={editingAccount.websiteURL || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, websiteURL: e.target.value })}
                        placeholder="Website URL"
                        className="w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                      />
                      <input
                        type="text"
                        value={editingAccount.deal || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, deal: e.target.value })}
                        placeholder="Deal"
                        className="w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                      />
                      <input
                        type="text"
                        value={editingAccount.ip || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, ip: e.target.value })}
                        placeholder="IP Address"
                        className="w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={editingAccount.name || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                        placeholder="Account Name"
                        className="w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={editingAccount.sharePercentage || 0}
                          onChange={(e) => setEditingAccount({ ...editingAccount, sharePercentage: parseFloat(e.target.value) || 0 })}
                          placeholder="Share %"
                          className="w-full px-2 py-1 md:px-3 md:py-2 pr-6 md:pr-8 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                        />
                        <span className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs md:text-sm">%</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={editingAccount.depositAmount || 0}
                        onChange={(e) => setEditingAccount({ ...editingAccount, depositAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="Deposit Amount"
                        className="w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                      />
                    </>
                  )}

                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editingAccount.referralPercentage || ''}
                      onChange={(e) => setEditingAccount({ 
                        ...editingAccount, 
                        referralPercentage: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      placeholder="Referral %"
                      className="w-full px-2 py-1 md:px-3 md:py-2 pr-6 md:pr-8 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm"
                    />
                    <span className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs md:text-sm">%</span>
                  </div>

                  <select
                    value={editingAccount.agentId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                      setEditingAccount({ ...editingAccount, agentId: e.target.value })
                    }
                    className="appearance-none w-full px-2 py-1 md:px-3 md:py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-xs md:text-sm pr-6 md:pr-8 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center]"
                    style={{ backgroundImage: dropdownArrowSvg }}
                  >
                    <option value="" className="bg-gray-800 text-white">Select Agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id} className="bg-gray-800 text-white hover:bg-cyan-500">
                        {isMobile ? agent.name.split(' ')[0] : agent.name} ({agent.accountCount})
                      </option>
                    ))}
                  </select>

                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 md:py-2 px-2 md:px-3 rounded-lg flex items-center justify-center text-xs md:text-sm"
                    >
                      <Save className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAccount(null)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-1 md:py-2 px-2 md:px-3 rounded-lg flex items-center justify-center text-xs md:text-sm"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className={`p-2 md:p-3 rounded-lg ${account.type === 'pph' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-yellow-500'}`}>
                        <CreditCard className="w-4 h-4 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1 md:gap-2">
                          <h3 className="text-sm md:text-lg font-semibold text-white truncate">
                            {account.type === 'pph' ? account.username : account.name}
                          </h3>
                          <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs ${
                            account.status === 'active' 
                              ? 'bg-green-500/20 text-green-400' 
                              : account.status === 'inactive'
                              ? 'bg-red-500/20 text-red-400'
                              : account.status === 'unused'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {account.status.toUpperCase()}
                          </span>
                          <span className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs ${
                            account.assignedToPlayerName 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {account.assignedToPlayerName ? 'ASSIGNED' : 'UNASSIGNED'}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400 truncate">Agent: {account.agentName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <button
                        onClick={() => setEditingAccount(account)}
                        className="p-1 md:p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <Edit className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-1 md:p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                    {account.type === 'pph' ? (
                      <>
                        {account.websiteURL && (
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                            <a
                              href={account.websiteURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 transition-colors truncate"
                            >
                              {isMobile ? account.websiteURL.replace(/^https?:\/\//, '') : account.websiteURL}
                            </a>
                          </div>
                        )}
                        {account.deal && (
                          <div className="text-gray-400 truncate">Deal: {account.deal}</div>
                        )}
                        {account.ip && (
                          <div className="text-gray-400 truncate">IP: {account.ip}</div>
                        )}
                        {account.referralPercentage && (
                          <div className="text-gray-400">Referral: {account.referralPercentage}%</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-gray-400">Share: {account.sharePercentage}%</div>
                        <div className="text-gray-400">Deposit: ${account.depositAmount?.toLocaleString()}</div>
                        {account.referralPercentage && (
                          <div className="text-gray-400">Referral: {account.referralPercentage}%</div>
                        )}
                      </>
                    )}
                    <div className="text-gray-400 truncate">
                      Status: {account.assignedToPlayerName ? (
                        <span className="text-green-400">Assigned to {isMobile ? account.assignedToPlayerName.split(' ')[0] : account.assignedToPlayerName}</span>
                      ) : (
                        <span className="text-yellow-400">Unassigned</span>
                      )}
                    </div>
                    <div className="text-gray-400">
                      Created: {account.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-black/80 backdrop-blur-lg rounded-lg md:rounded-xl p-4 md:p-8 border border-purple-500/20 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Add New Account</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                  Account Type
                </label>
                <select
                  value={newAccount.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setNewAccount({ ...newAccount, type: e.target.value as 'pph' | 'legal' })
                  }
                  className="appearance-none w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-8 md:pr-10 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center] text-sm md:text-base"
                  style={{ backgroundImage: dropdownArrowSvg }}
                >
                  <option value="pph" className="bg-gray-800 text-white">PPH Account</option>
                  <option value="legal" className="bg-gray-800 text-white">Legal Account</option>
                </select>
              </div>

              {newAccount.type === 'pph' ? (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newAccount.username}
                      onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="Enter account username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={newAccount.websiteURL}
                      onChange={(e) => setNewAccount({ ...newAccount, websiteURL: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Deal
                    </label>
                    <input
                      type="text"
                      value={newAccount.deal}
                      onChange={(e) => setNewAccount({ ...newAccount, deal: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="Enter deal details"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={newAccount.ip}
                      onChange={(e) => setNewAccount({ ...newAccount, ip: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="Enter IP address"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="Enter account name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Share Percentage (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={newAccount.sharePercentage}
                        onChange={(e) => setNewAccount({ ...newAccount, sharePercentage: e.target.value })}
                        className="w-full px-3 py-2 md:px-4 md:py-3 pr-8 md:pr-10 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                        placeholder="Enter share percentage"
                      />
                      <span className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                      Deposit Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAccount.depositAmount}
                      onChange={(e) => setNewAccount({ ...newAccount, depositAmount: e.target.value })}
                      className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                      placeholder="Enter deposit amount"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                  Referral Percentage (Optional)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newAccount.referralPercentage}
                    onChange={(e) => setNewAccount({ ...newAccount, referralPercentage: e.target.value })}
                    className="w-full px-3 py-2 md:px-4 md:py-3 pr-8 md:pr-10 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm md:text-base"
                    placeholder="Enter referral percentage"
                  />
                  <span className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                  Account holder
                </label>
                <select
                  value={newAccount.agentId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setNewAccount({ ...newAccount, agentId: e.target.value })
                  }
                  className="appearance-none w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-8 md:pr-10 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center] text-sm md:text-base"
                  style={{ backgroundImage: dropdownArrowSvg }}
                  required
                >
                  <option value="" className="bg-gray-800 text-white">Select Account Holder</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id} className="bg-gray-800 text-white hover:bg-cyan-500">
                      {agent.name} ({agent.accountCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                  Assign to Clicker (Optional)
                </label>
                <select
                  value={newAccount.assignedToPlayerUid}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setNewAccount({ 
                      ...newAccount, 
                      assignedToPlayerUid: e.target.value,
                      status: e.target.value ? 'active' : newAccount.status
                    })
                  }
                  className="appearance-none w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-8 md:pr-10 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center] text-sm md:text-base"
                  style={{ backgroundImage: dropdownArrowSvg }}
                >
                  <option value="" className="bg-gray-800 text-white">Unassigned</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.uid} className="bg-gray-800 text-white hover:bg-cyan-500">
                      {player.name} ({player.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                  Status
                </label>
                <select
                  value={newAccount.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    setNewAccount({ 
                      ...newAccount, 
                      status: e.target.value as 'active' | 'inactive' | 'unused' | 'locked',
                      // Reset assigned player if status is changed to something other than active
                      assignedToPlayerUid: e.target.value === 'active' ? newAccount.assignedToPlayerUid : ''
                    })
                  }
                  className="appearance-none w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 pr-8 md:pr-10 bg-no-repeat bg-[length:20px_20px] bg-[position:right_8px_center] text-sm md:text-base"
                  style={{ backgroundImage: dropdownArrowSvg }}
                >
                  <option value="active" className="bg-gray-800 text-white">Active</option>
                  <option value="inactive" className="bg-gray-800 text-white">Inactive</option>
                  <option value="unused" className="bg-gray-800 text-white">Unused</option>
                  <option value="locked" className="bg-gray-800 text-white">Locked</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 md:space-x-4 mt-4 md:mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 md:px-6 md:py-3 text-gray-400 hover:text-white transition-colors text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium py-2 md:py-3 px-4 md:px-6 rounded-lg transition-all duration-200 text-sm md:text-base"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}