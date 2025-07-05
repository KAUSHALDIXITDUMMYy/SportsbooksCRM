import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc as firestoreDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Plus, UserPlus, Trash2, Edit, Save, X } from 'lucide-react';

interface Player {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const playersQuery = query(collection(db, 'users'), where('role', '==', 'player'));
      const playersSnapshot = await getDocs(playersQuery);
      const playersData = playersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Player[];
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayer.email || !newPlayer.password || !newPlayer.name) return;

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newPlayer.email, newPlayer.password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(firestoreDoc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: newPlayer.name,
        role: 'player',
        createdAt: new Date()
      });
      
      setNewPlayer({ email: '', password: '', name: '' });
      setShowModal(false);
      fetchPlayers();
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error creating player. Please try again.');
    }
  };

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editingPlayer.name.trim()) return;

    try {
      await updateDoc(doc(db, 'users', editingPlayer.uid), {
        name: editingPlayer.name.trim(),
        email: editingPlayer.email.trim(),
        updatedAt: new Date()
      });
      setEditingPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };

  const handleDeletePlayer = async (playerUid: string) => {
    if (window.confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', playerUid));
        fetchPlayers();
      } catch (error) {
        console.error('Error deleting player:', error);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Players Management
          </h1>
          <p className="text-gray-400 mt-1">Manage player accounts and permissions</p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Player</span>
        </button>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400">Loading players...</div>
          </div>
        ) : players.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No players found. Create your first player!</p>
          </div>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:scale-105 transition-transform duration-200"
            >
              {editingPlayer?.id === player.id ? (
                <form onSubmit={handleEditPlayer} className="space-y-4">
                  <input
                    type="text"
                    value={editingPlayer.name}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white text-lg font-semibold"
                    placeholder="Player Name"
                    required
                  />
                  <input
                    type="email"
                    value={editingPlayer.email}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white"
                    placeholder="Email Address"
                    required
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg flex items-center justify-center"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPlayer(null)}
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
                      <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                        <UserPlus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{player.name}</h3>
                        <p className="text-sm text-gray-400">{player.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingPlayer(player)}
                        className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.uid)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-400">
                      Role: <span className="text-green-400 capitalize">{player.role}</span>
                    </div>
                    <div className="text-gray-400">
                      Created: {player.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Player Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 backdrop-blur-lg rounded-xl p-8 border border-purple-500/20 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-6">Add New Player</h2>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Enter player name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newPlayer.email}
                  onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={newPlayer.password}
                  onChange={(e) => setNewPlayer({ ...newPlayer, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Enter password"
                  required
                />
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
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}