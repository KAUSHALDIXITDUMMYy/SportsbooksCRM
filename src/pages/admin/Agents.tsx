import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Users, Trash2, Edit, Save, X, Search, Mail, Phone, CreditCard, Key, ChevronDown, ChevronUp } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  paypalEmail: string;
  paypalPassword: string;
  commissionPercentage: number;
  flatCommission?: number;
  createdAt: Date;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<string[]>([]);
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    phone: '',
    paypalEmail: '',
    paypalPassword: '',
    commissionPercentage: '',
    flatCommission: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    const filtered = agents.filter(agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone.includes(searchTerm)
    );
    setFilteredAgents(filtered);
  }, [agents, searchTerm]);

  const fetchAgents = async () => {
    try {
      const agentsSnapshot = await getDocs(collection(db, 'agents'));
      const agentsData = agentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Agent[];
      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgent.name.trim() || newAgent.commissionPercentage < 0) return;

    try {
      await addDoc(collection(db, 'agents'), {
        name: newAgent.name.trim(),
        email: newAgent.email.trim(),
        phone: newAgent.phone.trim(),
        paypalEmail: newAgent.paypalEmail.trim(),
        paypalPassword: newAgent.paypalPassword.trim(),
        commissionPercentage: parseFloat(newAgent.commissionPercentage),
        flatCommission: Number(newAgent.flatCommission) || 0,
        createdAt: new Date()
      });
      setNewAgent({ 
        name: '', 
        email: '', 
        phone: '', 
        paypalEmail: '', 
        paypalPassword: '', 
        commissionPercentage: '', 
        flatCommission: '' 
      });
      setShowModal(false);
      fetchAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
    }
  };

  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent || !editingAgent.name.trim()) return;

    try {
      await updateDoc(doc(db, 'agents', editingAgent.id), {
        name: editingAgent.name.trim(),
        email: editingAgent.email.trim(),
        phone: editingAgent.phone.trim(),
        paypalEmail: editingAgent.paypalEmail.trim(),
        paypalPassword: editingAgent.paypalPassword.trim(),
        commissionPercentage: editingAgent.commissionPercentage,
        flatCommission: Number(editingAgent.flatCommission) || 0,
        updatedAt: new Date()
      });
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this account holder?')) {
      try {
        await deleteDoc(doc(db, 'agents', agentId));
        fetchAgents();
      } catch (error) {
        console.error('Error deleting agent:', error);
      }
    }
  };

  const toggleExpandAgent = (agentId: string) => {
    setExpandedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Account Holders Management
          </h1>
          <p className="text-gray-400 mt-1">Manage your account holders and their commission rates</p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Account Holder</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search account holders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400">Loading account holders...</div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm ? 'No account holders found matching your search.' : 'No account holders found. Create your first account holder!'}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-black/20 backdrop-blur-sm rounded-xl border border-purple-500/20 transition-all duration-200 hover:border-purple-500/40"
            >
              <div className="p-6">
                {editingAgent?.id === agent.id ? (
                  <form onSubmit={handleEditAgent} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={editingAgent.email}
                        onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editingAgent.phone}
                        onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">PayPal Email</label>
                        <input
                          type="email"
                          value={editingAgent.paypalEmail}
                          onChange={(e) => setEditingAgent({ ...editingAgent, paypalEmail: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">PayPal Password</label>
                        <input
                          type="password"
                          value={editingAgent.paypalPassword}
                          onChange={(e) => setEditingAgent({ ...editingAgent, paypalPassword: e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Commission %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editingAgent.commissionPercentage}
                            onChange={(e) => setEditingAgent({ ...editingAgent, commissionPercentage: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 pr-8 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                            required
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Flat Commission</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingAgent.flatCommission || 0}
                            onChange={(e) => setEditingAgent({ ...editingAgent, flatCommission: Number(e.target.value) || 0 })}
                            className="w-full px-3 py-2 pr-8 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                            required
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg flex items-center justify-center"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAgent(null)}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-lg flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                          <p className="text-sm text-gray-400">
                            Commission: {agent.commissionPercentage}% + ${agent.flatCommission || 0} flat
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingAgent(agent)}
                          className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      Created: {agent.createdAt.toLocaleDateString()}
                    </div>

                    {/* Collapsible details */}
                    {expandedAgents.includes(agent.id) && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-400">Email:</span>{' '}
                          <span className="text-white ml-1 truncate">{agent.email || '-'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-400">Phone:</span>{' '}
                          <span className="text-white ml-1">{agent.phone || '-'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-400">PayPal:</span>{' '}
                          <span className="text-white ml-1 truncate">{agent.paypalEmail || '-'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Key className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-400">PayPal PW:</span>{' '}
                          <span className="text-white ml-1">{agent.paypalPassword ? '••••••••' : '-'}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expand/Collapse Button */}
              <div className="px-6 pb-4 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpandAgent(agent.id);
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center"
                >
                  {expandedAgents.includes(agent.id) ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      <span>Details</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-lg rounded-xl p-8 border border-purple-500/20 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Account Holder</h2>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Enter account holder name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Enter email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newAgent.phone}
                  onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PayPal Email
                  </label>
                  <input
                    type="email"
                    value={newAgent.paypalEmail}
                    onChange={(e) => setNewAgent({ ...newAgent, paypalEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="PayPal email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PayPal Password
                  </label>
                  <input
                    type="password"
                    value={newAgent.paypalPassword}
                    onChange={(e) => setNewAgent({ ...newAgent, paypalPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="PayPal password"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Commission Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newAgent.commissionPercentage}
                      onChange={(e) => setNewAgent({ ...newAgent, commissionPercentage: e.target.value })}
                      className="w-full px-4 py-3 pr-8 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Enter commission percentage"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Flat Commission ($)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAgent.flatCommission}
                      onChange={(e) => setNewAgent({ ...newAgent, flatCommission: e.target.value })}
                      className="w-full px-4 py-3 pr-8 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="Enter flat commission"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200"
                >
                  Add Account Holder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}