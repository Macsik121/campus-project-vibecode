#!/usr/bin/env bash
# CAMPUS API — E2E smoke: полный цикл по всем разделам.
# Запуск: ./server/scripts/smoke.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
PASS="Password1!"
JQ_BIN="$(command -v jq || true)"

jget() { # jget '<json>' '<python-expr>'
  python3 -c "import sys,json;print(json.load(sys.stdin)$1)" <<< "$2"
}

step() { echo -e "\n=== $* ==="; }

step "1. Login (director, senior, counselour)"
DTOKEN=$(curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"director@campus.ru\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
STOKEN=$(curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"senior@campus.ru\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
CTOKEN=$(curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"ivan@campus.ru\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "токены получены"

step "2. Отряд вожатого"
SQUAD=$(curl -sf "$BASE/users/squad" -H "Authorization: Bearer $CTOKEN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["squadId"])')
echo "squadId=$SQUAD"

step "3. Дети отряда + заметки"
CHILD=$(curl -sf "$BASE/squads/$SQUAD/children" -H "Authorization: Bearer $CTOKEN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["children"][0]["id"])')
curl -sf -X PUT "$BASE/children" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d "{\"id\":\"$CHILD\",\"notes\":\"smoke $(date +%s)\"}" > /dev/null
echo "заметки обновлены для $CHILD"

step "4. Событие (senior) + посещаемость"
FROM=$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)
TO=$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ)
EVENT=$(curl -sf -X POST "$BASE/events" -H "Authorization: Bearer $STOKEN" -H 'Content-Type: application/json' -d "{\"title\":\"smoke-событие\",\"eventType\":\"general\",\"timeFrom\":\"$FROM\",\"timeTo\":\"$TO\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -sf -X POST "$BASE/events/$EVENT/attendance" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d "{\"childId\":\"$CHILD\",\"present\":true}" > /dev/null
PRESENT=$(curl -sf "$BASE/events/$EVENT/attendance/$SQUAD" -H "Authorization: Bearer $CTOKEN" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["childIds"]))')
echo "событие $EVENT, отмечено детей: $PRESENT"

step "5. Уведомления: read + read-all"
NOTIF=$(curl -sf "$BASE/notifications" -H "Authorization: Bearer $CTOKEN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
curl -sf -X POST "$BASE/notifications/read" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d "{\"notifId\":\"$NOTIF\"}" > /dev/null
curl -sf -X POST "$BASE/notifications/read-all" -H "Authorization: Bearer $CTOKEN" > /dev/null
UNREAD=$(curl -sf "$BASE/notifications" -H "Authorization: Bearer $CTOKEN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["unreadCount"])')
echo "непрочитанных после read-all: $UNREAD"

step "6. Чат"
curl -sf -X POST "$BASE/chat/messages" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d '{"message":"smoke чат"}' > /dev/null
MSGS=$(curl -sf "$BASE/chat/messages?limit=100" -H "Authorization: Bearer $CTOKEN" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
echo "сообщений в чате: $MSGS"

step "7. Заявки: register → approve → login"
EMAIL="smoke$(date +%s)@campus.ru"
curl -sf -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Тест\",\"email\":\"$EMAIL\",\"password\":\"Secret1!\"}" > /dev/null
APP=$(curl -sf "$BASE/applications?status=pending" -H "Authorization: Bearer $DTOKEN" | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
curl -sf -X POST "$BASE/applications/$APP/approve" -H "Authorization: Bearer $DTOKEN" > /dev/null
curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"Secret1!\"}" | python3 -c 'import sys,json;assert json.load(sys.stdin)["token"]'
echo "заявка $APP одобрена, вход работает"

step "8. Логи (senior) и статистика (director)"
LOGS=$(curl -sf "$BASE/logs?limit=5" -H "Authorization: Bearer $STOKEN" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
STATS=$(curl -sf "$BASE/stats/shift" -H "Authorization: Bearer $DTOKEN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["attendance"]["present"],"/",d["attendance"]["total"])')
echo "последних логов: $LOGS; посещаемость за смену: $STATS"

step "ГОТОВО: все разделы проверены"
