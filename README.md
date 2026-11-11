# Velvet North Blackjack

A responsive, private-room blackjack game for up to **12 players at one table**, with each player joining from their own phone, tablet, or computer.

## Included
- 250,000 virtual chips for every new player.
- Casino payouts are not limited by a house bankroll. Chip balances are capped only at JavaScript's safe-integer limit.
- No visible dealer avatar. Cards are dealt and moved automatically; the house hand is handled in the background.
- Hit, stand, and double-down.
- Six-deck shoe, dealer stands on 17, blackjack pays 3:2.
- Shared room state through Socket.IO.
- Atmospheric northern-night / quiet jazz-club scenery with animated aurora, stars, felt table, and sliding cards.
- Mobile-friendly layout.

## Run it on your computer
1. Install Node.js 18 or newer from https://nodejs.org/
2. Extract this ZIP.
3. Open a terminal in the extracted `Velvet_North_Blackjack` folder.
4. Run `npm install`
5. Run `npm start`
6. Open http://localhost:3000

## Let players join from separate devices
The game server must be reachable by all players. For a quick same-Wi-Fi test, find the computer's local IP address and have everyone open `http://YOUR-COMPUTER-IP:3000`.

For players in different locations, deploy this folder to a Node.js hosting service that supports long-running WebSocket connections (for example, Render, Railway, or a VPS). Set the start command to `npm start`. Share the deployed HTTPS address and the same room code with everyone. Do not use GitHub Pages alone: it serves static files and cannot run this multiplayer server.

## Start a table
1. Player one enters a name and creates a short table code, such as `NORTH7`.
2. Everyone else enters their name and the same code.
3. Each player chooses a bet and presses **Place bet**.
4. Once all connected players have placed a bet, cards are dealt automatically. If needed, the table host can press **Next round** after everyone is ready.
5. Each player controls only their own hand from their own device.

## Notes
- This is a casual virtual-chip game, not real-money gambling. There are no deposits, withdrawals, or real-money prizes.
- Each new connection is treated as a new player. Reconnecting after closing the browser creates a fresh seat and starting balance.
- The server is authoritative for card dealing and balances, but this starter project does not include accounts, persistent balances, private invite links, or production anti-cheat protections.
- The visual direction is an original, serene Nordic-night jazz atmosphere inspired by the mood requested. It does not include or reproduce the referenced recording. Add a licensed audio file yourself if you have rights to use it.
