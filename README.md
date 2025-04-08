# Valorant Match Data API

This project provides an API to fetch and process Valorant match data from [vlr.gg](https://www.vlr.gg). It extracts detailed match information including team stats, player performances, and map veto details.

## Features

- Fetch match data by match ID
- Clean and structure raw match data
- Cache responses for performance
- Group player stats by map

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## API Usage

Make a GET request to `/api/match/[id]` where `[id]` is the match ID from vlr.gg.

Example:
```bash
curl http://localhost:3000/api/match/12345
```

## Response Structure

The API returns JSON data with the following structure:

```json
{
  "event": {
    "name": "Event name",
    "series": "Event series",
    "logo": "URL to event logo"
  },
  "teams": {
    "team1": {
      "name": "Team name",
      "logo": "URL to team logo",
      "elo": "Team ELO rating"
    },
    "team2": {
      "name": "Team name",
      "logo": "URL to team logo",
      "elo": "Team ELO rating"
    }
  },
  "players": {
    "MapName": [
      {
        "name": "Player name",
        "country": "Player country",
        "agent": "Agent played",
        "rating": "Player rating",
        "acs": "Average combat score",
        "kills": "Kill count",
        "deaths": "Death count",
        "assists": "Assist count",
        "kdDiff": "Kill-death difference",
        "kast": "KAST percentage",
        "adr": "Average damage per round",
        "hsPercent": "Headshot percentage",
        "firstKills": "First kill count",
        "firstDeaths": "First death count",
        "fkDiff": "First kill difference"
      }
    ]
  }
}
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)