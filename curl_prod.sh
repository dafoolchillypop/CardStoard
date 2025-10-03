#!/bin/bash
set -e

API="https://cardstoard.com/api"

echo "=== 1. Health check ==="
curl -k -i $API/health
echo -e "\nPress Enter to continue..."
read

echo "=== 2. Register user ==="
curl -k -i -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'
echo -e "\nPress Enter to continue..."
read

echo "=== 3. Login (store cookies) ==="
curl -k -i -c cookies.txt -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'
echo -e "\nPress Enter to continue..."
read

echo "=== 4. Get current user (/auth/me) ==="
curl -k -i -b cookies.txt $API/auth/me
echo -e "\nPress Enter to continue..."
read

echo "=== 5. Get global settings ==="
curl -k -i -b cookies.txt $API/settings/
echo -e "\nPress Enter to continue..."
read

echo "=== 6. Create a test card ==="
curl -k -s -b cookies.txt -X POST $API/cards/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Tony",
    "last_name":"Gwynn",
    "year":1983,
    "brand":"Topps",
    "card_number":"482",
    "rookie":true,
    "grade":3.0,
    "book_high":200,
    "book_mid":150,
    "book_low":100
  }' | tee card.json
CARD_ID=$(jq '.id' card.json)
echo "Created card with ID: $CARD_ID"
echo -e "\nPress Enter to continue..."
read

echo "=== 7. List all cards ==="
curl -k -i -b cookies.txt $API/cards/
echo -e "\nPress Enter to continue..."
read

echo "=== 8. Update the card (change grade + brand) ==="
curl -k -i -b cookies.txt -X PUT $API/cards/$CARD_ID \
  -H "Content-Type: application/json" \
  -d '{"grade":1.5,"brand":"Topps Update"}'
echo -e "\nPress Enter to continue..."
read

echo "=== 9. Get updated card ==="
curl -k -i -b cookies.txt $API/cards/$CARD_ID
echo -e "\nPress Enter to continue..."
read

echo "=== 10. Delete the card ==="
curl -k -i -b cookies.txt -X DELETE $API/cards/$CARD_ID
echo -e "\nPress Enter to continue..."
read

echo "=== 11. Confirm no cards remain ==="
curl -k -i -b cookies.txt $API/cards/
echo -e "\nPress Enter to finish..."
read

echo "=== Done! Full CRUD tested successfully ==="
