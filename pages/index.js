import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [matchId, setMatchId] = useState('');
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/match/${matchId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMatchData(data);
      } else {
        setError(data.error || 'Failed to fetch match data');
      }
    } catch (err) {
      setError('An error occurred while fetching match data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Valorant Match Stats</title>
        <meta name="description" content="View Valorant match statistics" />
      </Head>

      <main>
        <h1>Valorant Match Stats</h1>
        
        <div className="search-box">
          <input 
            type="text" 
            value={matchId} 
            onChange={(e) => setMatchId(e.target.value)}
            placeholder="Enter VLR.gg match ID"
          />
          <button onClick={fetchMatchData} disabled={loading || !matchId}>
            {loading ? 'Loading...' : 'Get Stats'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {matchData && (
          <div className="match-container">
            <h2>{matchData.event.name}</h2>
            <p>{matchData.date} at {matchData.time}</p>
            
            <div className="teams">
              <div className="team">
                <h3>{matchData.teams.team1.name}</h3>
                {matchData.teams.team1.logo && <img src={matchData.teams.team1.logo} alt={matchData.teams.team1.name} />}
                <p>ELO: {matchData.teams.team1.elo || 'N/A'}</p>
              </div>
              
              <div className="vs">
                <span>VS</span>
                <p>{matchData.seriesScore.team1} - {matchData.seriesScore.team2}</p>
              </div>
              
              <div className="team">
                <h3>{matchData.teams.team2.name}</h3>
                {matchData.teams.team2.logo && <img src={matchData.teams.team2.logo} alt={matchData.teams.team2.name} />}
                <p>ELO: {matchData.teams.team2.elo || 'N/A'}</p>
              </div>
            </div>
            
            <h3>Players</h3>
            <div className="players">
              {Array.isArray(matchData.players) ? matchData.players : 
               (matchData.overall && Array.isArray(matchData.overall.players) ? matchData.overall.players : []).map((player, index) => (
                <div key={index} className="player">
                  <h4>{player.name}</h4>
                  <p>Agent: {player.agent}</p>
                  <p>Rating: {player.rating}</p>
                  <p>K/D/A: {player.kills}/{player.deaths}/{player.assists}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .search-box {
          margin: 20px 0;
          display: flex;
          gap: 10px;
        }
        
        input {
          padding: 8px;
          flex: 1;
        }
        
        button {
          padding: 8px 16px;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .error {
          color: red;
          margin: 10px 0;
        }
        
        .match-container {
          margin-top: 20px;
        }
        
        .teams {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
        }
        
        .team {
          text-align: center;
          flex: 1;
        }
        
        .vs {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .players {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .player {
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}