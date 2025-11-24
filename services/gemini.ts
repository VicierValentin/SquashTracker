import { GoogleGenAI } from "@google/genai";
import { Match, User } from "../types";

const API_KEY = process.env.API_KEY || ''; 

// We handle the case where API KEY is missing gracefully in the UI
// But per instructions, we assume it's available in env.

export const generateMatchCommentary = async (match: Match, playerA: User, playerB: User): Promise<string> => {
  if (!API_KEY) return "AI commentary unavailable (Missing API Key).";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
      You are a high-energy squash commentator. Write a short, exciting 3-sentence summary of the following match result.
      
      Match Details:
      Tournament ID: ${match.tournamentId}
      ${playerA.displayName} (${playerA.ranking}) vs ${playerB.displayName} (${playerB.ranking})
      
      Winner: ${match.winnerLogin === playerA.login ? playerA.displayName : playerB.displayName}
      
      Scores:
      ${match.scores.map((s, i) => `Game ${i+1}: ${s.playerAScore}-${s.playerBScore}`).join(', ')}
      
      Focus on the closeness of the games or the dominance of the winner.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No commentary generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not contact the sports desk.";
  }
};

export const getPlayerCoachAdvice = async (user: User, recentMatches: Match[]): Promise<string> => {
    if (!API_KEY) return "AI Coach unavailable.";

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const stats = {
            wins: recentMatches.filter(m => m.winnerLogin === user.login).length,
            losses: recentMatches.filter(m => m.winnerLogin && m.winnerLogin !== user.login).length,
            total: recentMatches.length
        };

        const prompt = `
            You are a professional Squash Coach. Give advice to player ${user.displayName}.
            
            Stats:
            Matches: ${stats.total}
            Wins: ${stats.wins}
            Losses: ${stats.losses}
            Club: ${user.club}
            Rank: ${user.ranking}
            
            Provide 3 bullet points of strategic advice based on these general stats to help them improve their ranking. Be encouraging but technical.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Keep practicing your drives!";

    } catch (e) {
        return "Coach is currently out to lunch.";
    }
}
