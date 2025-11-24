import React, { useState } from 'react';
import { useNavigate } from '../lib/router';
import { db } from '../services/storage';
import { useAuth } from '../App';
import { TournamentType } from '../types';

export default function CreateTournament() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    type: TournamentType.ROUND_ROBIN,
    poolSize: 4,
    pointsPerGame: 11,
    bestOf: 3,
    mustWinByTwo: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    db.createTournament({
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate,
      type: formData.type,
      poolSize: formData.poolSize,
      status: 'Draft',
      participants: [user.login], // Creator auto-joins
      adminLogin: user.login,
      rules: {
        pointsPerGame: formData.pointsPerGame,
        bestOf: formData.bestOf as 3 | 5,
        mustWinByTwo: formData.mustWinByTwo,
      },
    }, user.login);

    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Tournament</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Set up the rules and invite players.</p>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="col-span-6 sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700">Tournament Title</label>
            <input
              type="text"
              required
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="col-span-6">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="col-span-6 sm:col-span-3">
             <label className="block text-sm font-medium text-gray-700">Start Date</label>
             <input
                type="date"
                required
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
             />
          </div>

          <div className="col-span-6 sm:col-span-3">
             <label className="block text-sm font-medium text-gray-700">Format</label>
             <select
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as TournamentType})}
             >
               <option value={TournamentType.ROUND_ROBIN}>Pools (Round Robin)</option>
               <option value={TournamentType.SINGLE_ELIMINATION}>Knockout Bracket</option>
             </select>
          </div>

          {formData.type === TournamentType.ROUND_ROBIN && (
             <div className="col-span-6 sm:col-span-3">
               <label className="block text-sm font-medium text-gray-700">Players per Pool</label>
               <input
                 type="number"
                 min={3}
                 max={10}
                 className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                 value={formData.poolSize}
                 onChange={e => setFormData({...formData, poolSize: parseInt(e.target.value)})}
               />
             </div>
          )}

          <div className="col-span-6">
            <h4 className="text-md font-medium text-gray-900 mb-2">Scoring Rules</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500">Points</label>
                <input
                   type="number"
                   className="mt-1 block w-full p-2 border rounded-md"
                   value={formData.pointsPerGame}
                   onChange={e => setFormData({...formData, pointsPerGame: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Best Of</label>
                <select
                   className="mt-1 block w-full p-2 border rounded-md"
                   value={formData.bestOf}
                   onChange={e => setFormData({...formData, bestOf: parseInt(e.target.value) as 3|5})}
                >
                  <option value={3}>3 Games</option>
                  <option value={5}>5 Games</option>
                </select>
              </div>
              <div className="flex items-center mt-6">
                 <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={formData.mustWinByTwo}
                    onChange={e => setFormData({...formData, mustWinByTwo: e.target.checked})}
                 />
                 <label className="ml-2 block text-sm text-gray-900">Win by 2</label>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-5">
           <div className="flex justify-end">
             <button
               type="button"
               onClick={() => navigate('/')}
               className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             >
               Create
             </button>
           </div>
        </div>
      </form>
    </div>
  );
}
