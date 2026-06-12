# CBCMD — Combat Command Asset Management v5.0

## Features
- **Force Structure**: UTC → FCP → INC (8 per FCP) → Assets
- **Warehouse View**: 2D shelf grid with drag-and-drop for FCPs and INCs
- **Requirements Tracking**: Per-INC required vs actual inventory with cost/deficit analysis
- **Document Uploads**: Attach files to assets and increments
- **6 Themes**: Dark → Dark Grey → Charcoal → Slate → Silver → White
- **Sub-Inventory**: Component tracking within assets
- **Import/Export**: Excel with package/increment targeting
- **Snapshots**: Full database backup and restore
- **Admin Maintenance Mode**: System config, dropdowns, modules, custom fields, users

## Quick Start
```bash
chmod +x start.sh && ./start.sh start
```
First account created becomes admin. Default port: 9093.

## Commands
```bash
./start.sh start    # Build and launch
./start.sh stop     # Shut down
./start.sh restart  # Rebuild
./start.sh logs     # View logs
```
# Combat_Command
