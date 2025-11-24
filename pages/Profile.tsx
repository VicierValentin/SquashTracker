import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { db } from '../services/storage';
import { Match, User } from '../types';
import { getPlayerCoachAdvice } from '../services/gemini';
import { User as UserIcon, Award, Activity, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Profile() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Match[]>([]);
  const [coachAdvice, setCoachAdvice] = useState<string>('');
  const [loadingCoach, setLoadingCoach] = useState(false);

  useEffect(() => {
    if (user) {
        const allMatches = db.getAllMatches();
        const userMatches = allMatches.filter((m: Match) => 
            (m.playerALogin === user.login || m.playerBLogin === user.login) && m.status === 'COMPLETED'
        );
        setHistory(userMatches);
    }
  }, [user]);

  const getAdvice = async () => {
    if (!user) return;
    setLoadingCoach(true);
    const advice = await getPlayerCoachAdvice(user, history);
    setCoachAdvice(advice);
    setLoadingCoach(false);
  };

  if (!user) return null;

  const wins = history.filter(m => m.winnerLogin === user.login).length;
  const losses = history.length - wins;
  
  const chartData = [
      { name: 'Wins', value: wins },
      { name: 'Losses', value: losses }
  ];

  return (
    <div className="space-y-6">
       <div className="bg-white shadow overflow-hidden sm:rounded-lg">
           <div className="px-4 py-5 sm:px-6 flex items-center">
               <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                   <UserIcon className="h-8 w-8" />
               </div>
               <div className="ml-4">
                   <h3 className="text-xl leading-6 font-medium text-gray-900">{user.displayName}</h3>
                   <p className="max-w-2xl text-sm text-gray-500">@{user.login} • {user.club} • Rank: {user.ranking}</p>
               </div>
           </div>
           <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Matches Played</dt>
                        <dd className="mt-1 text-2xl font-semibold text-gray-900">{history.length}</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Win Rate</dt>
                        <dd className="mt-1 text-2xl font-semibold text-green-600">
                            {history.length ? Math.round((wins / history.length) * 100) : 0}%
                        </dd>
                    </div>
                </dl>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white shadow sm:rounded-lg p-6">
               <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                   <Activity className="h-5 w-5 mr-2 text-indigo-500"/> Performance
               </h4>
               <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={chartData}>
                           <XAxis dataKey="name" />
                           <YAxis allowDecimals={false} />
                           <Tooltip />
                           <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                       </BarChart>
                   </ResponsiveContainer>
               </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 shadow sm:rounded-lg p-6 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-white opacity-10 rounded-full blur-xl"></div>
               <h4 className="text-lg font-medium mb-4 flex items-center">
                   <Zap className="h-5 w-5 mr-2 text-yellow-300"/> AI Coach Corner
               </h4>
               <p className="text-indigo-100 text-sm mb-4">
                   Get personalized advice based on your match history using Gemini AI.
               </p>
               
               {coachAdvice ? (
                   <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-sm leading-relaxed whitespace-pre-line">
                       {coachAdvice}
                   </div>
               ) : (
                   <button 
                     onClick={getAdvice}
                     disabled={loadingCoach}
                     className="w-full bg-white text-indigo-600 font-bold py-2 px-4 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50"
                   >
                       {loadingCoach ? 'Analyzing Stats...' : 'Ask Coach'}
                   </button>
               )}
           </div>
       </div>
    </div>
  );
}