export async function fetchPlacesData(placeId: string) {
  try {
    const response = await fetch(`${import.meta.env.PLACES_URL}&key=${import.meta.env.PLACES_ACCESS_TOKEN}&placeid=${placeId}`, {
      method: "GET",
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error reading stream:", error);
  }
}
