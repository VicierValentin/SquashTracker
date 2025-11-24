import React, { useState, useEffect } from 'react';
import { Match, GameScore, ScoringRules, MatchStatus } from '../types';
import { User } from '../types';
import { db } from '../services/storage';
import { generateMatchCommentary } from '../services/gemini';
import { X, Save, MessageSquare } from 'lucide-react';
import { useAuth } from '../App';

interface ScoreModalProps {
  match: Match;
  playerA: User;
  playerB: User;
  rules: ScoringRules;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ScoreModal({ match, playerA, playerB, rules, onClose, onUpdate }: ScoreModalProps) {
  const { user } = useAuth();
  // Initialize with existing scores or a blank game
  const [scores, setScores] = useState<GameScore[]>(match.scores.length ? match.scores : [{ playerAScore: 0, playerBScore: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  const calculateWinner = (scores: GameScore[]) => {
    let aWins = 0;
    let bWins = 0;
    scores.forEach(g => {
        // Simple winner check based on current points.
        // Validating "finished" games is harder without explicit "game over" flags,
        // so we assume if points > rules.points and diff >= 2, it's a win.
        if (g.playerAScore >= rules.pointsPerGame && g.playerAScore >= g.playerBScore + (rules.mustWinByTwo ? 2 : 1)) aWins++;
        if (g.playerBScore >= rules.pointsPerGame && g.playerBScore >= g.playerAScore + (rules.mustWinByTwo ? 2 : 1)) bWins++;
    });
    return { aWins, bWins };
  };

  const { aWins, bWins } = calculateWinner(scores);
  const gamesNeededToWin = Math.ceil(rules.bestOf / 2);
  const matchWinner = aWins >= gamesNeededToWin ? playerA.login : bWins >= gamesNeededToWin ? playerB.login : undefined;

  const handleScoreChange = (index: number, player: 'A' | 'B', val: string) => {
    const num = parseInt(val) || 0;
    const newScores = [...scores];
    if (player === 'A') newScores[index].playerAScore = num;
    else newScores[index].playerBScore = num;
    setScores(newScores);
  };

  const addGame = () => {
    if (matchWinner) return;
    setScores([...scores, { playerAScore: 0, playerBScore: 0 }]);
  };

  const removeGame = (index: number) => {
    const newScores = scores.filter((_, i) => i !== index);
    setScores(newScores);
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate last game isn't 0-0 if trying to complete
    const updatedMatch: Match = {
        ...match,
        scores: scores,
        winnerLogin: matchWinner,
        status: matchWinner ? MatchStatus.COMPLETED : MatchStatus.IN_PROGRESS,
        completedAt: matchWinner ? new Date().toISOString() : undefined
    };
    
    db.updateMatch(updatedMatch, user.login);
    
    if (matchWinner) {
       setAnalyzing(true);
       const commentary = await generateMatchCommentary(updatedMatch, playerA, playerB);
       setAiAnalysis(commentary);
       setAnalyzing(false);
       // We don't close immediately if we want to show commentary
    } else {
        onUpdate();
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button onClick={onClose} className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              Match Score
            </h3>
            <div className="mt-2 text-sm text-gray-500 flex justify-between">
                 <span>{playerA.displayName} vs {playerB.displayName}</span>
                 <span>Best of {rules.bestOf}</span>
            </div>
            
            <div className="mt-4 space-y-3">
              {scores.map((game, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                   <span className="text-gray-500 text-sm font-medium w-16">Game {idx + 1}</span>
                   <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        value={game.playerAScore}
                        onChange={(e) => handleScoreChange(idx, 'A', e.target.value)}
                        className="w-16 p-2 border border-gray-300 rounded text-center"
                      />
                      <span className="text-gray-400">-</span>
                      <input 
                        type="number" 
                        value={game.playerBScore}
                        onChange={(e) => handleScoreChange(idx, 'B', e.target.value)}
                        className="w-16 p-2 border border-gray-300 rounded text-center"
                      />
                   </div>
                   {idx === scores.length - 1 && scores.length > 1 && !matchWinner && (
                       <button onClick={() => removeGame(idx)} className="text-red-500 text-xs px-2">Remove</button>
                   )}
                </div>
              ))}
            </div>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            
            <div className="mt-4 flex justify-between items-center">
                 <div className="text-sm font-bold text-gray-900">
                     Result: {aWins} - {bWins}
                     {matchWinner && <span className="ml-2 text-green-600">(Winner: {matchWinner === playerA.login ? playerA.displayName : playerB.displayName})</span>}
                 </div>
                 {!matchWinner && (
                     <button type="button" onClick={addGame} className="text-indigo-600 text-sm hover:underline">
                         + Add Game
                     </button>
                 )}
            </div>

            {aiAnalysis && (
                <div className="mt-4 bg-indigo-50 p-3 rounded-md border border-indigo-100">
                    <div className="flex items-center text-indigo-800 mb-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        <span className="text-sm font-bold">AI Recap</span>
                    </div>
                    <p className="text-sm text-indigo-900 italic">"{aiAnalysis}"</p>
                </div>
            )}
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              onClick={handleSave}
              disabled={analyzing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
            >
              {analyzing ? 'Analyzing...' : matchWinner && aiAnalysis ? 'Close' : 'Save Score'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
