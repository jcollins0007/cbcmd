#!/bin/bash
set -e
RED='\033[0;31m';GRN='\033[0;32m';CYN='\033[0;36m';YEL='\033[1;33m';NC='\033[0m'
echo -e "${CYN}"
echo "╔══════════════════════════════════════════╗"
echo "║       COMBAT COMMAND  ·  CBCMD v5.0      ║"
echo "║   Asset Management + Warehouse System     ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
[ ! -f .env ] && cp .env.example .env && echo -e "${YEL}[+] Created .env from template${NC}"
case "${1:-start}" in
  start)
    echo -e "${GRN}[▶] Building and starting...${NC}"
    docker compose up -d --build
    PORT=$(grep APP_PORT .env 2>/dev/null|cut -d= -f2)
    PORT=${PORT:-9093}
    echo ""
    echo -e "${GRN}════════════════════════════════════════${NC}"
    echo -e "${CYN}  CBCMD running → http://localhost:${PORT}${NC}"
    echo -e "${YEL}  First account = admin${NC}"
    echo -e "${GRN}════════════════════════════════════════${NC}"
    ;;
  stop) docker compose down;;
  restart) docker compose down && docker compose up -d --build
    PORT=$(grep APP_PORT .env 2>/dev/null|cut -d= -f2);PORT=${PORT:-9093}
    echo -e "${CYN}  CBCMD → http://localhost:${PORT}${NC}";;
  logs) docker compose logs -f;;
  *) echo "Usage: $0 {start|stop|restart|logs}";;
esac
