#!/bin/bash
# curl_tester.sh - Test API CRUD flow

BASE_URL="http://localhost:8000"
EMAIL="test@example.com"
PASSWORD="test123"

pause() {
  read -p "Press Enter to continue..."
}

echo "=== 1. Health check ==="
curl -i $BASE_URL/health
pause

echo "=== 2. Register user ==="
curl -i -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}"
pause

echo "=== 3. Login (store cookies) ==="
curl -i -c cookies.txt -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}"
pause

echo "=== 4. Get current user (/auth/me) ==="
curl -i -b cookies.txt $BASE_URL/auth/me
pause

echo "=== 5. Get global settings ==="
curl -i -b cookies.txt $BASE_URL/settings/
pause

echo "=== 6. Create a test card ==="
curl -i -b cookies.txt -X POST $BASE_URL/cards/ \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Tony","last_name":"Gwynn","year":1983,"brand":"Topps","card_number":"482","rookie":true,"grade":3.0,"book_high":200.0,"book_mid":150.0,"book_low":100.0}'
pause

echo "=== 7. List all cards ==="
curl -i -b cookies.txt $BASE_URL/cards/
pause

echo "=== 8. Update the card (change grade + brand) ==="
curl -i -b cookies.txt -X PUT $BASE_URL/cards/2 \
  -H "Content-Type: application/json" \
  -d '{"brand":"Topps Update","grade":1.5}'
pause

echo "=== 9. Get updated card ==="
curl -i -b cookies.txt $BASE_URL/cards/2
pause

echo "=== 10. Delete the card ==="
curl -i -b cookies.txt -X DELETE $BASE_URL/cards/2
pause

echo "=== 11. Confirm no cards remain ==="
curl -i -b cookies.txt $BASE_URL/cards/
pause

echo "=== Done! Full CRUD tested successfully ==="
