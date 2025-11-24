import React, { useEffect, useState } from 'react';
import { useParams } from '../lib/router';
import { db } from '../services/storage';
import { Tournament, Match, User, PoolStandings } from '../types';
import ScoreModal from '../components/ScoreModal';
import { useAuth } from '../App';
import { Play, CheckCircle, Clock } from 'lucide-react';

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | undefined>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [standings, setStandings] = useState<Record<string, PoolStandings[]>>({});
  
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const loadData = () => {
    if (!id) return;
    const t = db.getTournament(id);
    const m = db.getMatchesForTournament(id);
    const u = db.getAllUsers();
    setTournament(t);
    setMatches(m);
    setUsers(u);

    if (t && t.type === 'ROUND_ROBIN') {
        const s = db.getStandings(id);
        // Group standings by pool
        const grouped: Record<string, PoolStandings[]> = {};
        s.forEach(stat => {
            if (!grouped[stat.poolId]) grouped[stat.poolId] = [];
            grouped[stat.poolId].push(stat);
        });
        
        // Sort standings locally for display
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
                return b.pointsDiff - a.pointsDiff;
            });
        });
        
        setStandings(grouped);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const generateSchedule = () => {
    if (id && user) {
        db.generateSchedule(id, user.login);
        loadData();
    }
  };

  const getUser = (login: string) => users.find(u => u.login === login) || { displayName: login } as User;

  if (!tournament) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">{tournament.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">{tournament.description}</p>
            </div>
            {tournament.status === 'Draft' && tournament.adminLogin === user?.login && (
                <button 
                  onClick={generateSchedule}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Generate Schedule
                </button>
            )}
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tournament.status}</dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Participants</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tournament.participants.length}</dd>
                </div>
            </dl>
        </div>
      </div>

      {/* Standings Section */}
      {tournament.type === 'ROUND_ROBIN' && Object.keys(standings).length > 0 && (
         <div className="space-y-6">
             <h3 className="text-xl font-bold text-gray-900">Pool Standings</h3>
             {Object.entries(standings).sort((a, b) => a[0].localeCompare(b[0])).map(([poolId, stats]: [string, PoolStandings[]]) => (
                 <div key={poolId} className="bg-white shadow overflow-hidden sm:rounded-lg">
                     <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                         <h4 className="text-md font-medium text-gray-800">{poolId}</h4>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50">
                               <tr>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">W</th>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">L</th>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points +/-</th>
                               </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                               {stats.map(s => (
                                   <tr key={s.login}>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                           {s.matchesWon >= stats.length - 1 && stats.length > 1 && <CheckCircle className="h-4 w-4 text-green-500 mr-2" />}
                                           {getUser(s.login).displayName}
                                       </td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.matchesWon}</td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.matchesLost}</td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.pointsDiff > 0 ? '+' : ''}{s.pointsDiff}</td>
                                   </tr>
                               ))}
                           </tbody>
                        </table>
                     </div>
                 </div>
             ))}
         </div>
      )}

      {/* Matches Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
         <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Matches</h3>
         </div>
         <ul className="divide-y divide-gray-200">
             {matches.length === 0 && <li className="px-4 py-4 text-gray-500 text-center">Schedule not generated yet.</li>}
             {matches.map(m => {
                 const pA = getUser(m.playerALogin);
                 const pB = getUser(m.playerBLogin);
                 const canEdit = user && (user.role === 'ADMIN' || user.login === m.playerALogin || user.login === m.playerBLogin || user.login === tournament.adminLogin);

                 return (
                     <li key={m.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                         <div className="flex items-center justify-between">
                             <div className="flex-1 min-w-0">
                                 <div className="flex items-center text-sm font-medium text-indigo-600 truncate mb-1">
                                    {m.poolId ? `${m.poolId} • ` : ''} 
                                    {pA.displayName} vs {pB.displayName}
                                 </div>
                                 <div className="flex items-center text-sm text-gray-500">
                                     {m.status === 'COMPLETED' ? (
                                         <span className="font-bold text-gray-900">
                                             {m.winnerLogin === pA.login ? pA.displayName : pB.displayName} won 
                                             ({m.scores.reduce((acc, g) => acc + (g.playerAScore > g.playerBScore && m.winnerLogin === pA.login ? 1 : 0) + (g.playerBScore > g.playerAScore && m.winnerLogin === pB.login ? 1 : 0), 0)} - {m.scores.reduce((acc, g) => acc + (g.playerAScore < g.playerBScore && m.winnerLogin === pA.login ? 1 : 0) + (g.playerBScore < g.playerAScore && m.winnerLogin === pB.login ? 1 : 0), 0)})
                                         </span>
                                     ) : (
                                         <span className="flex items-center"><Clock className="h-4 w-4 mr-1"/> Scheduled</span>
                                     )}
                                 </div>
                             </div>
                             <div>
                                 {canEdit && (
                                     <button
                                       onClick={() => setEditingMatch(m)}
                                       className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                     >
                                         {m.status === 'COMPLETED' ? 'Edit Score' : 'Enter Score'}
                                     </button>
                                 )}
                             </div>
                         </div>
                     </li>
                 );
             })}
         </ul>
      </div>

      {editingMatch && user && (
          <ScoreModal 
             match={editingMatch} 
             playerA={getUser(editingMatch.playerALogin)} 
             playerB={getUser(editingMatch.playerBLogin)}
             rules={tournament.rules}
             onClose={() => setEditingMatch(null)}
             onUpdate={loadData}
          />
      )}
    </div>
  );
}
