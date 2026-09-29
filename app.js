const API_URL = window.WEATHER_API_URL || "http://127.0.0.1:8000/api/weather";

const weatherForm = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city");
const searchButton = document.querySelector("#search-button");
const formMessage = document.querySelector("#form-message");
const emptyState = document.querySelector("#empty-state");
const weatherContent = document.querySelector("#weather-content");
const weatherPanel = document.querySelector("#weather-panel");

const weatherCodes = {
  0: ["Clear sky", "☀"],
  1: ["Mainly clear", "◒"], 2: ["Partly cloudy", "◐"], 3: ["Overcast", "☁"],
  45: ["Foggy", "≋"], 48: ["Rime fog", "≋"],
  51: ["Light drizzle", "⌁"], 53: ["Drizzle", "⌁"], 55: ["Heavy drizzle", "⌁"],
  61: ["Light rain", "☂"], 63: ["Rain", "☂"], 65: ["Heavy rain", "☂"],
  71: ["Light snow", "❄"], 73: ["Snow", "❄"], 75: ["Heavy snow", "❄"],
  80: ["Rain showers", "☂"], 81: ["Rain showers", "☂"], 82: ["Heavy showers", "☂"],
  95: ["Thunderstorm", "ϟ"], 96: ["Thunderstorm", "ϟ"], 99: ["Thunderstorm", "ϟ"]
};

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();

  if (!city) {
    showMessage("Please enter a city name.");
    cityInput.focus();
    return;
  }

  setLoading(true);
  showMessage("Looking up the forecast...");

  try {
    const response = await fetch(`${API_URL}?city=${encodeURIComponent(city)}`, {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "The weather service could not complete the request.");
    }

    renderWeather(payload);
    showMessage("");
  } catch (error) {
    const message = error instanceof TypeError
      ? `Cannot connect to the Laravel API at ${API_URL}. Start Laravel and check CORS.`
      : error.message || "The Laravel API returned an invalid response.";
    showMessage(message);
    document.querySelector("#api-status").innerHTML = '<span class="status-dot" style="background:#e9785f"></span> API unavailable';
  } finally {
    setLoading(false);
  }
});

function renderWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const [condition, icon] = describeWeather(current.weather_code);

  document.querySelector("#location-name").textContent = data.location.name;
  document.querySelector("#coordinates").textContent = `${data.location.country} · ${Number(data.location.latitude).toFixed(2)}°, ${Number(data.location.longitude).toFixed(2)}°`;
  document.querySelector("#temperature").textContent = `${Math.round(current.temperature_2m)}°`;
  document.querySelector("#weather-icon").textContent = icon;
  document.querySelector("#condition").textContent = condition;
  document.querySelector("#updated-at").textContent = `Updated ${formatTime(current.time)}`;

  const metrics = [
    ["Feels like", `${Math.round(current.apparent_temperature)}°`],
    ["Wind speed", `${Math.round(current.wind_speed_10m)} km/h`],
    ["Humidity", `${current.relative_humidity_2m}%`]
  ];
  document.querySelector("#metrics").innerHTML = metrics.map(([label, value]) => `
    <div class="metric"><p class="metric-label">${label}</p><p class="metric-value">${value}</p></div>
  `).join("");

  document.querySelector("#forecast-grid").innerHTML = daily.time.slice(0, 5).map((date, index) => {
    const [dayCondition, dayIcon] = describeWeather(daily.weather_code[index]);
    return `<article class="forecast-day" title="${dayCondition}">
      <p class="forecast-day-name">${index === 0 ? "Today" : formatDay(date)}</p>
      <p class="forecast-icon" aria-hidden="true">${dayIcon}</p>
      <p class="forecast-temps"><strong>${Math.round(daily.temperature_2m_max[index])}°</strong><span>${Math.round(daily.temperature_2m_min[index])}°</span></p>
    </article>`;
  }).join("");

  emptyState.hidden = true;
  weatherContent.hidden = false;
  weatherPanel.setAttribute("aria-busy", "false");
  document.querySelector("#api-status").innerHTML = '<span class="status-dot"></span> Laravel weather API';
}

function describeWeather(code) {
  return weatherCodes[code] || ["Variable conditions", "◌"];
}

function formatDay(date) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.querySelector("span:first-child").textContent = isLoading ? "Loading" : "Search";
  weatherPanel.setAttribute("aria-busy", String(isLoading));
}

function showMessage(message) {
  formMessage.textContent = message;
}
