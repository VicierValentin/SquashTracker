import React, { useEffect, useState } from 'react';
import { db } from '../services/storage';
import { Tournament } from '../types';
import { Link } from '../lib/router';
import { Calendar, Users, ChevronRight, PlayCircle } from 'lucide-react';
import { useAuth } from '../App';

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    setTournaments(db.getAllTournaments());
  }, []);

  const handleJoin = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      db.joinTournament(id, user.login);
      setTournaments(db.getAllTournaments());
    }
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/create"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
          >
            Create Tournament
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Active Tournaments</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {tournaments.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500">
              No tournaments found. Create one to get started!
            </li>
          ) : (
            tournaments.map((t) => {
              const isParticipant = user && t.participants.includes(user.login);
              return (
                <li key={t.id}>
                  <Link to={`/tournament/${t.id}`} className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">{t.title}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            t.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            t.status === 'Completed' ? 'bg-gray-100 text-gray-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {t.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {t.participants.length} Players
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {new Date(t.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm sm:mt-0">
                          {!isParticipant && t.status === 'Draft' && (
                             <button 
                               onClick={(e) => handleJoin(t.id, e)}
                               className="mr-4 text-indigo-600 hover:text-indigo-900 font-medium z-10 relative"
                             >
                               Join Now
                             </button>
                          )}
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
