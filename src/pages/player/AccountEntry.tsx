import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save, Calendar, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';

interface Account {
  id: string;
  type: 'pph' | 'legal';
  username?: string;
  name?: string;
  websiteURL?: string;
  agentName: string;
  status: 'active' | 'inactive';
}

interface Entry {
  id?: string;
  accountId: string;
  playerUid: string;
  date: string;
  startingBalance: number;
  endingBalance: number;
  refillAmount: number;
  withdrawal: number;
  complianceReview: number;
  profitLoss: number;
  clickerSettled: string;
  clickerAmount: number;
  accHolderSettled: string;
  accHolderAmount: number;
  companySettled: string;
  companyAmount: number;
  taxableAmount: number;
  referralAmount: number;
  accountStatus: 'active' | 'inactive';
  notes: string;
}

export default function AccountEntry() {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Entry>({
    accountId: id || '',
    playerUid: userData?.uid || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startingBalance: 0,
    endingBalance: 0,
    refillAmount: 0,
    withdrawal: 0,
    complianceReview: 0,
    profitLoss: 0,
    clickerSettled: 'No',
    clickerAmount: 0,
    accHolderSettled: 'No',
    accHolderAmount: 0,
    companySettled: 'No',
    companyAmount: 0,
    taxableAmount: 0,
    referralAmount: 0,
    accountStatus: 'active',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && userData?.uid) {
      fetchAccountData();
    }
  }, [id, userData]);

  useEffect(() => {
    // Calculate profit/loss automatically
    const profitLoss = currentEntry.endingBalance - currentEntry.startingBalance + currentEntry.withdrawal - currentEntry.refillAmount;
    if (profitLoss !== currentEntry.profitLoss) {
      setCurrentEntry(prev => ({ ...prev, profitLoss }));
    }
  }, [currentEntry.startingBalance, currentEntry.endingBalance, currentEntry.withdrawal, currentEntry.refillAmount]);

  const fetchAccountData = async () => {
    try {
      if (!id) return;
      
      // Fetch account details
      const accountDoc = await getDoc(doc(db, 'accounts', id));
      if (accountDoc.exists()) {
        const accountData = accountDoc.data();
        
        // Get agent name
        const agentDoc = await getDoc(doc(db, 'agents', accountData.agentId));
        const agentName = agentDoc.exists() ? agentDoc.data().name : 'Unknown Agent';
        
        setAccount({
          id: accountDoc.id,
          type: accountData.type || 'pph', // Default to 'pph' if type is missing
          username: accountData.username,
          name: accountData.name,
          websiteURL: accountData.websiteURL,
          agentName,
          status: accountData.status || 'active' // Default to 'active' if status is missing
        });
        
        // Fetch entries for this account
        const entriesQuery = query(
          collection(db, 'entries'),
          where('accountId', '==', id),
          where('playerUid', '==', userData?.uid)
        );
        const entriesSnapshot = await getDocs(entriesQuery);
        const entriesData = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Entry[];
        setEntries(entriesData);
        
        // Check if there's an entry for today
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayEntry = entriesData.find(entry => entry.date === today);
        if (todayEntry) {
          setCurrentEntry(todayEntry);
        } else {
          // Set initial account status from account data
          setCurrentEntry(prev => ({
            ...prev,
            accountStatus: accountData.status || 'active'
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (currentEntry.id) {
        // Update existing entry
        await updateDoc(doc(db, 'entries', currentEntry.id), {
          ...currentEntry,
          updatedAt: new Date()
        });
      } else {
        // Create new entry
        await addDoc(collection(db, 'entries'), {
          ...currentEntry,
          createdAt: new Date()
        });
      }
      
      // Update account status if changed
      if (account && currentEntry.accountStatus !== account.status) {
        await updateDoc(doc(db, 'accounts', id!), {
          status: currentEntry.accountStatus,
          updatedAt: new Date()
        });
      }
      
      navigate('/player/dashboard');
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Entry, value: string | number) => {
    setCurrentEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading account data...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Account not found or access denied.</p>
        <button
          onClick={() => navigate('/player/dashboard')}
          className="mt-4 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/player/dashboard')}
            className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {account.type === 'pph' ? account.username : account.name}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm ${
                account.type === 'pph' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-orange-500/20 text-orange-400'
              }`}>
                {(account.type || 'pph').toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                currentEntry.accountStatus === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {currentEntry.accountStatus}
              </span>
            </div>
            <p className="text-gray-400 mt-1">Agent: {account.agentName}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300">{format(new Date(), 'MMMM dd, yyyy')}</span>
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <DollarSign className="w-6 h-6 mr-2" />
          Daily Performance Entry
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={currentEntry.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Status
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('accountStatus', currentEntry.accountStatus === 'active' ? 'inactive' : 'active')}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentEntry.accountStatus === 'active'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {currentEntry.accountStatus === 'active' ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  <span className="capitalize">{currentEntry.accountStatus}</span>
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Starting Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.startingBalance}
                onChange={(e) => handleInputChange('startingBalance', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ending Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.endingBalance}
                onChange={(e) => handleInputChange('endingBalance', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Refill Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.refillAmount}
                onChange={(e) => handleInputChange('refillAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Withdrawal
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.withdrawal}
                onChange={(e) => handleInputChange('withdrawal', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Compliance Review
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.complianceReview}
                onChange={(e) => handleInputChange('complianceReview', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profit/Loss (Auto-calculated)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.profitLoss}
                className={`w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none cursor-not-allowed ${
                  currentEntry.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Clicker Settled
              </label>
              <select
                value={currentEntry.clickerSettled}
                onChange={(e) => handleInputChange('clickerSettled', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Clicker Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.clickerAmount}
                onChange={(e) => handleInputChange('clickerAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Holder Settled
              </label>
              <select
                value={currentEntry.accHolderSettled}
                onChange={(e) => handleInputChange('accHolderSettled', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Holder Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.accHolderAmount}
                onChange={(e) => handleInputChange('accHolderAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Settled
              </label>
              <select
                value={currentEntry.companySettled}
                onChange={(e) => handleInputChange('companySettled', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.companyAmount}
                onChange={(e) => handleInputChange('companyAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Taxable Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.taxableAmount}
                onChange={(e) => handleInputChange('taxableAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referral Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={currentEntry.referralAmount}
                onChange={(e) => handleInputChange('referralAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={currentEntry.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Add any additional notes here..."
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/player/dashboard')}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}