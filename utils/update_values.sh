# assumes ACCESS_TOKEN and REFRESH_TOKEN are already exported

# Fetch *all* cards by setting a high limit (e.g. 2000)
ids=$(curl -s "http://localhost:8000/cards/?limit=2000" \
  -b "access_token=${ACCESS_TOKEN}; refresh_token=${REFRESH_TOKEN}" \
  | jq '.[].id')

total=$(echo "$ids" | wc -l)
count=0

echo "🔄 Found $total cards to revalue..."
echo ""

for id in $ids; do
  ((count++))
  echo "[$count/$total] Revaluing card ID: $id..."

  curl -s -X POST "http://localhost:8000/cards/$id/value" \
    -H "Content-Type: application/json" \
    -b "access_token=${ACCESS_TOKEN}; refresh_token=${REFRESH_TOKEN}" \
    | jq '{id: .id, name: (.first_name + " " + .last_name), brand: .brand, value: .value}'
done

echo ""
echo "✅ Revaluation complete: $count cards processed."

