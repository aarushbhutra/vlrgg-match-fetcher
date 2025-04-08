import axios from 'axios';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

function cleanJsonOutput(data) {
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => cleanJsonOutput(item));
      } else {
        const result = {};
        for (const key in data) {
          const cleanKey = key.replace(/[\t\n\r]+/g, ' ').trim();
          
          // Special handling for players array to group by map
          if (cleanKey === 'players' && data.vetoInfo && data.vetoInfo.picks) {
            const mapPlayers = {};
            data.vetoInfo.picks.forEach((pick, mapIndex) => {
              const mapName = pick.map;
              const startIdx = mapIndex * 10;
              const endIdx = startIdx + 10;
              mapPlayers[mapName] = data.players.slice(startIdx, endIdx).map(player => cleanJsonOutput(player));
            });
            result[cleanKey] = mapPlayers;
          } else {
            result[cleanKey] = cleanJsonOutput(data[key]);
          }
        }
        return result;
      }
    } else if (typeof data === 'string') {
      return data.replace(/[\t\n\r]+/g, ' ').trim();
    } else {
      return data;
    }
}

function extractHeaderInfo(document) {
    const event = {
        name: document.querySelector('.match-header-event div').textContent.trim(),
        series: document.querySelector('.match-header-event-series').textContent.trim().replace(/\s+/g, ' '),
        logo: document.querySelector('.match-header-event img')?.src || null
    };

    const date = document.querySelectorAll('.match-header-date .moment-tz-convert')[0]?.textContent.trim();
    const time = document.querySelectorAll('.match-header-date .moment-tz-convert')[1]?.textContent.trim();

    const team1 = {
        name: document.querySelector('.match-header-link.mod-1 .wf-title-med')?.textContent.trim(),
        logo: document.querySelector('.match-header-link.mod-1 img')?.src || null,
        elo: document.querySelector('.match-header-link.mod-1 .match-header-link-name-elo')?.textContent.trim().match(/\[(\d+)\]/)?.[1] || null
    };

    const team2 = {
        name: document.querySelector('.match-header-link.mod-2 .wf-title-med')?.textContent.trim(),
        logo: document.querySelector('.match-header-link.mod-2 img')?.src || null,
        elo: document.querySelector('.match-header-link.mod-2 .match-header-link-name-elo')?.textContent.trim().match(/\[(\d+)\]/)?.[1] || null
    };

    const matchStatus = document.querySelector('.match-header-vs-note')?.textContent.trim();
    const seriesScore = {
        team1: document.querySelector('.match-header-vs-score-winner')?.textContent.trim(),
        team2: document.querySelector('.match-header-vs-score-loser')?.textContent.trim()
    };
    const seriesType = document.querySelectorAll('.match-header-vs-note')[1]?.textContent.trim();

    const winner = document.querySelector('.match-header-vs-score-winner') === document.querySelectorAll('.match-header-vs-score span')[0] ? 'team1' : 
                   document.querySelector('.match-header-vs-score-winner') === document.querySelectorAll('.match-header-vs-score span')[2] ? 'team2' : null;

    const vetoText = document.querySelector('.match-header-note')?.textContent.trim();
    const vetoInfo = parseVetoInfo(vetoText);

    return {
        event: event,
        date: date,
        time: time,
        teams: {
            team1: team1,
            team2: team2
        },
        matchStatus: matchStatus,
        seriesScore: seriesScore,
        seriesType: seriesType,
        winner: winner,
        vetoInfo: vetoInfo
    };
}

function processStatsTable(document, playersArray, table) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const player = {
            name: row.querySelector('.mod-player .text-of')?.textContent.trim(),
            country: row.querySelector('.mod-player .flag')?.title || '',
            agent: row.querySelector('.mod-agents img')?.title || '',
            rating: row.querySelector('.mod-stat:nth-child(3) .side.mod-both')?.textContent.trim(),
            acs: row.querySelector('.mod-stat:nth-child(4) .side.mod-both')?.textContent.trim(),
            kills: row.querySelector('.mod-vlr-kills .side.mod-both')?.textContent.trim(),
            deaths: row.querySelector('.mod-vlr-deaths .side.mod-both')?.textContent.trim(),
            assists: row.querySelector('.mod-vlr-assists .side.mod-both')?.textContent.trim(),
            kdDiff: row.querySelector('.mod-kd-diff .side.mod-both')?.textContent.trim(),
            kast: row.querySelector('.mod-stat:nth-child(9) .side.mod-both')?.textContent.trim(),
            adr: row.querySelector('.mod-stat:nth-child(10) .side.mod-both')?.textContent.trim(),
            hsPercent: row.querySelector('.mod-stat:nth-child(11) .side.mod-both')?.textContent.trim(),
            firstKills: row.querySelector('.mod-fb .side.mod-both')?.textContent.trim(),
            firstDeaths: row.querySelector('.mod-fd .side.mod-both')?.textContent.trim(),
            fkDiff: row.querySelector('.mod-fk-diff .side.mod-both')?.textContent.trim()
        };
        playersArray.push(player);
    });
}

function parseVetoInfo(vetoText) {
    if (!vetoText) {
        return {
            bans: [],
            picks: [],
            remaining: ''
        };
    }

    const bans = [];
    const picks = [];
    const remaining = vetoText.match(/remains(.+)/)?.[1]?.trim() || '';

    vetoText.split(';').forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes('ban')) {
            const parts = trimmed.split('ban');
            if (parts.length >= 2) {
                const team = parts[0].trim();
                const map = parts[1].trim();
                bans.push({ team, map });
            }
        } else if (trimmed.includes('pick')) {
            const parts = trimmed.split('pick');
            if (parts.length >= 2) {
                const team = parts[0].trim();
                const map = parts[1].trim();
                picks.push({ team, map });
            }
        }
    });

    return {
        bans: bans,
        picks: picks,
        remaining: remaining
    };
}

export default async function handler(req, res) {
    const { id } = req.query;
    
    try {
        // Validate match ID
        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({ error: 'Invalid match ID format' });
        }
        
        // Check if data exists in cache
        const cacheDir = path.join(process.cwd(), 'data');
        const cacheFile = path.join(cacheDir, `${id}.json`);
        
        if (fs.existsSync(cacheFile)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                return res.status(200).json(cachedData);
            } catch (error) {
                console.error('Error reading cached data:', error);
                // Continue to fetch fresh data if cache is corrupted
            }
        }
        
        // Fetch data from external source
        let response;
        try {
            response = await axios.get(`https://www.vlr.gg/${id}`);
            if (response.status !== 200) {
                return res.status(response.status).json({ error: 'Failed to fetch match data from source' });
            }
        } catch (error) {
            console.error('Error fetching match data:', error);
            return res.status(500).json({ error: 'Failed to fetch match data from source' });
        }
        
        // Parse and validate DOM
        let document;
        try {
            const dom = new JSDOM(response.data);
            document = dom.window.document;
            
            // Basic validation of required elements
            if (!document.querySelector('.match-header-event') || 
                !document.querySelector('.match-header-link.mod-1') || 
                !document.querySelector('.vm-stats-game')) {
                return res.status(404).json({ error: 'Match data not found or incomplete' });
            }
        } catch (error) {
            console.error('Error parsing match data:', error);
            return res.status(500).json({ error: 'Failed to parse match data' });
        }
        
        // Extract and process data
        try {
            const headerInfo = extractHeaderInfo(document);
            const players = [];
            
            document.querySelectorAll('.vm-stats-game').forEach(table => {
                processStatsTable(document, players, table);
            });
            
            if (players.length === 0) {
                return res.status(404).json({ error: 'No player data found' });
            }
            
            const matchData = {
                ...headerInfo,
                players: players.slice(0, 10).concat(players.slice(20, 30)),
                overall: {
                    players: players.slice(0, 10).concat(players.slice(20, 30))
                },
                maps: {}
            };

            if (headerInfo.vetoInfo && headerInfo.vetoInfo.picks) {
                headerInfo.vetoInfo.picks.forEach((pick, index) => {
                    const startIdx = index * 10;
                    const endIdx = startIdx + 10;
                    matchData.maps[pick.map] = {
                        players: players.slice(startIdx, endIdx)
                    };
                });
            }
            
            const cleanedData = cleanJsonOutput(matchData);
            
            // Create cache directory if it doesn't exist
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }
            
            // Save to cache
            fs.writeFileSync(cacheFile, JSON.stringify(cleanedData, null, 2));
            
            res.status(200).json(cleanedData);
        } catch (error) {
            console.error('Error processing match data:', error);
            return res.status(500).json({ error: 'Failed to process match data' });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Failed to read game data' });
    }
}