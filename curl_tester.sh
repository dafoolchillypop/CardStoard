#!/bin/bash
set -e

echo "=== 1. Health check ==="
curl -i http://localhost:8000/health
echo -e "\nPress Enter to continue..."
read

echo "=== 2. Register user ==="
curl -i -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'
echo -e "\nPress Enter to continue..."
read

echo "=== 3. Login (store cookies) ==="
curl -i -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'
echo -e "\nPress Enter to continue..."
read

echo "=== 4. Get current user (/auth/me) ==="
curl -i -b cookies.txt http://localhost:8000/auth/me
echo -e "\nPress Enter to continue..."
read

echo "=== 5. Get global settings ==="
curl -i -b cookies.txt http://localhost:8000/settings/
echo -e "\nPress Enter to continue..."
read

echo "=== 6. Create a test card ==="
curl -s -b cookies.txt -X POST http://localhost:8000/cards/ \
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
curl -i -b cookies.txt http://localhost:8000/cards/
echo -e "\nPress Enter to continue..."
read

echo "=== 8. Update the card (change grade + brand) ==="
curl -i -b cookies.txt -X PUT http://localhost:8000/cards/$CARD_ID \
  -H "Content-Type: application/json" \
  -d '{"grade":1.5,"brand":"Topps Update"}'
echo -e "\nPress Enter to continue..."
read

echo "=== 9. Get updated card ==="
curl -i -b cookies.txt http://localhost:8000/cards/$CARD_ID
echo -e "\nPress Enter to continue..."
read

echo "=== 10. Delete the card ==="
curl -i -b cookies.txt -X DELETE http://localhost:8000/cards/$CARD_ID
echo -e "\nPress Enter to continue..."
read

echo "=== 11. Confirm no cards remain ==="
curl -i -b cookies.txt http://localhost:8000/cards/
echo -e "\nPress Enter to finish..."
read

echo "=== Done! Full CRUD tested successfully ==="
