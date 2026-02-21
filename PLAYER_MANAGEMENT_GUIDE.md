# Player Management Guide

## Overview
The dashboard now includes comprehensive player management features accessible through the **RPG → Admin** section at: `http://localhost:3000/rpg?tab=rpg-admin`

## Features

### 1. View All Players
Click **"👥 Load All Players"** to display:
- Total player count
- Average level across all players
- Highest level achieved
- Total gold in circulation
- Searchable list of all players with their stats

### 2. Player Information
Each player card shows:
- Username and User ID
- Current level
- Character class
- Gold balance
- HP status

### 3. Individual Player Actions

#### View Player Details
- Click **👁️ View** to see complete player data as JSON
- Useful for debugging or checking specific attributes

#### Reset Individual Player
- Click **🔄 Reset** to reset a single player
- Keeps username and User ID
- Resets to level 1 with default stats
- **Cannot be undone** (unless you have a backup)

#### Delete Individual Player
- Click **🗑️** to permanently delete a player
- Removes all player data
- **Cannot be undone** (unless you have a backup)

### 4. Bulk Operations

#### Backup Players
- Click **💾 Backup Players** to create a timestamped backup
- Saves to: `data/players-backup-[timestamp].json`
- **Recommended before any reset/delete operations**

#### Reset All Players
- Click **🔄 Reset All Players**
- Type "RESET ALL" to confirm
- Automatically creates backup first
- Resets all players to level 1 with default stats
- Keeps usernames and User IDs

#### Delete All Players
- Click **🗑️ Delete All Players**
- Type "DELETE ALL" to confirm
- Automatically creates backup first
- Completely wipes all player data (creates empty database)
- **Use before making bot public** to start fresh

### 5. Search & Filter
- Use the search box to filter players by:
  - User ID
  - Username
- Results update in real-time as you type

## Before Making Bot Public

### Recommended Steps:

1. **Create a Backup**
   ```
   Click: 💾 Backup Players
   ```
   This saves your current test data in case you need it later.

2. **Delete All Players**
   ```
   Click: 🗑️ Delete All Players
   Type: DELETE ALL
   ```
   This gives your public users a clean start with no test data.

3. **Verify Clean State**
   ```
   Click: 👥 Load All Players
   Should show: "No players found"
   ```

4. **Optional: Test Registration**
   - Have someone use `/rpg` command
   - Reload players list to verify new player creation works

## Safety Features

### Automatic Backups
- Reset/delete operations automatically create backups
- Backups are named with timestamps for easy identification
- Located in `data/` folder with prefixes:
  - `players-pre-reset-[timestamp].json` - Before bulk reset
  - `players-pre-delete-[timestamp].json` - Before bulk delete

### Confirmation Prompts
- All destructive operations require confirmation
- Bulk operations require typing exact confirmation text
- Prevents accidental data loss

### API Endpoints
All operations use authenticated API endpoints:
- `GET /api/rpg/players/list` - List all players
- `GET /api/rpg/players/:userId` - Get player details
- `POST /api/rpg/players/:userId/reset` - Reset player
- `DELETE /api/rpg/players/:userId` - Delete player
- `POST /api/rpg/players/backup` - Create backup
- `POST /api/rpg/players/reset-all` - Reset all
- `POST /api/rpg/players/delete-all` - Delete all

## Restoring from Backup

If you need to restore from a backup:

1. Stop the bot
2. Navigate to `data/` folder
3. Find your backup file (e.g., `players-backup-2026-02-11T10-30-00-000Z.json`)
4. Copy its contents
5. Paste into `data/players.json`
6. Restart the bot

## Access Requirements

- Dashboard password required (set in `.env` as `DASHBOARD_PASSWORD`)
- Default port: `http://localhost:3000`
- Only accessible to users with dashboard login credentials

## Performance Notes

- Loading 1000+ players may take a few seconds
- Search/filter operations are client-side (instant)
- Bulk operations include automatic backups (adds ~1-2 seconds)

## Troubleshooting

### "No player data found"
- Normal if no one has used `/rpg` yet
- Players.json will be created when first user registers

### "Error loading players"
- Check `data/players.json` exists
- Verify file is valid JSON
- Check console for detailed error message

### Backup not found
- Check `data/` folder for backup files
- Backups only created by dashboard operations
- Manual copies won't be listed in interface
