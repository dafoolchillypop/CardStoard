const API_URL = "http://localhost:8000";

export async function getCards() {
  const response = await fetch(`${API_URL}/cards/`);
  return await response.json();
}
