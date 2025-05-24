import BASE_URL from "./config";

// Obține tokenul din localStorage
const getAccessToken = () => localStorage.getItem("access_token");

// Cerere GET cu Bearer Token
export const fetchWithAuth = async (endpoint) => {
  const token = getAccessToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Eroare la accesarea resursei");
  }

  return await response.json();
};
