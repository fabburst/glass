export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const userLat = lat ? parseFloat(lat) : 48.85;
  const userLon = lon ? parseFloat(lon) : 2.35;

  const delta = 1.0; 
  const lamin = userLat - delta;
  const lomin = userLon - delta;
  const lamax = userLat + delta;
  const lomax = userLon + delta;

  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); 
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();

    if (!data.states || data.states.length === 0) throw new Error("Empty states");

    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
    res.status(200).json(data);

  } catch (error) {
    // FALLBACK SIMPLIFIÉ AVEC HÉLICOPTÈRE DE TEST
    const mockData = {
        time: Date.now(),
        states: [
            // id, callsign, country, x, last_contact, lon, lat, alt, on_ground, vel, heading, v_rate, ..., cat
            ["394a8f", "AFR123", "France", 0, Date.now()/1000, userLon + 0.02, userLat + 0.02, 1200, false, 180, 45, 12.5, null, null, null, null, 0], 
            ["4841d2", "SAMU34", "France", 0, Date.now()/1000, userLon - 0.01, userLat - 0.01, 300, false, 60, 180, 0, null, null, null, null, 7], // 7 = Hélico
            ["7700XX", "MAYDAY", "France", 0, Date.now()/1000, userLon + 0.01, userLat - 0.04, 2000, false, 150, 90, -15, null, null, null, null, 0], 
        ]
    };
    // Force Squawk 7700 pour le test (index 6 n'est pas dans le tableau brut mocké ci-dessus par défaut)
    mockData.states[2][6] = "7700";

    res.status(200).json(mockData);
  }
}
