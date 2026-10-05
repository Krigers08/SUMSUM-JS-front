const API_URL = window.WEATHER_API_URL || "http://127.0.0.1:8000/api/weather";
const API_BASE_URL = API_URL.endsWith("/weather")
  ? API_URL.slice(0, -"/weather".length)
  : API_URL.replace(/\/$/, "");

const registerForm = document.querySelector("#register-form");
const registerName = document.querySelector("#register-name");
const registerEmail = document.querySelector("#register-email");
const registerPassword = document.querySelector("#register-password");
const registerPasswordConfirmation = document.querySelector("#register-password-confirmation");
const loginForm = document.querySelector("#login-form");
const loginEmail = document.querySelector("#login-email");
const loginPassword = document.querySelector("#login-password");
const authMessage = document.querySelector("#auth-message");
const accountForms = document.querySelector("#account-forms");
const accountSession = document.querySelector("#account-session");
const accountName = document.querySelector("#account-name");
const logoutButton = document.querySelector("#logout-button");
const favoriteCityButton = document.querySelector("#favorite-city-button");
const favoritesMessage = document.querySelector("#favorites-message");
const favoriteCitiesList = document.querySelector("#favorite-cities");

const weatherForm = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city");
const searchButton = document.querySelector("#search-button");
const formMessage = document.querySelector("#form-message");
const emptyState = document.querySelector("#empty-state");
const weatherContent = document.querySelector("#weather-content");
const weatherPanel = document.querySelector("#weather-panel");

let savedFavorites = [];
let currentWeather = null;

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

function setAuthMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.classList.remove("success", "error");
  if (type) {
    authMessage.classList.add(type);
  }
}

function getAuthToken() {
  return localStorage.getItem("weather_api_token");
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("weather_api_user") || "null");
  } catch {
    return null;
  }
}

function setFavoritesMessage(message) {
  favoritesMessage.textContent = message;
}

function syncFavoriteButton() {
  const city = currentWeather?.location?.name;
  const favorite = savedFavorites.find((item) => item.city.toLowerCase() === city?.toLowerCase());
  const signedIn = Boolean(getAuthToken());

  favoriteCityButton.disabled = !signedIn || !city;
  favoriteCityButton.textContent = favorite ? "★ Saved" : "☆ Save city";
  favoriteCityButton.setAttribute("aria-pressed", String(Boolean(favorite)));
  favoriteCityButton.setAttribute(
    "aria-label",
    favorite ? `Remove ${city} from favorite cities` : `Save ${city || "city"} to favorite cities`
  );
}

async function removeFavorite(favorite) {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites/${favorite.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });

    if (!response.ok) throw new Error("Could not remove this favorite city.");

    savedFavorites = savedFavorites.filter((item) => item.id !== favorite.id);
    setFavoritesMessage("City removed from favorites.");
    renderFavorites();
  } catch (error) {
    setFavoritesMessage(error.message || "Could not remove this favorite city.");
  }
}

function renderFavorites() {
  favoriteCitiesList.replaceChildren();

  if (!getAuthToken()) {
    setFavoritesMessage("Sign in to save and access your favorite cities.");
    syncFavoriteButton();
    return;
  }

  if (savedFavorites.length === 0) {
    setFavoritesMessage("No favorite cities yet.");
    syncFavoriteButton();
    return;
  }

  setFavoritesMessage("");
  savedFavorites.forEach((favorite) => {
    const item = document.createElement("li");
    const searchButton = document.createElement("button");
    const removeButton = document.createElement("button");

    searchButton.type = "button";
    searchButton.className = "favorite-search-button";
    searchButton.textContent = favorite.city;
    searchButton.addEventListener("click", () => {
      cityInput.value = favorite.city;
      weatherForm.requestSubmit();
    });

    removeButton.type = "button";
    removeButton.className = "favorite-remove-button";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${favorite.city} from favorite cities`);
    removeButton.addEventListener("click", () => removeFavorite(favorite));

    item.append(searchButton, removeButton);
    favoriteCitiesList.append(item);
  });

  syncFavoriteButton();
}

function syncAccountUI() {
  const signedIn = Boolean(getAuthToken());
  const user = getStoredUser();

  accountForms.hidden = signedIn;
  accountSession.hidden = !signedIn;
  accountName.textContent = user?.name || user?.email || "Signed in";
  renderFavorites();
}

async function loadFavorites() {
  if (!getAuthToken()) {
    savedFavorites = [];
    renderFavorites();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data.message || "Could not load favorite cities.");
    }

    savedFavorites = data;
    renderFavorites();
  } catch (error) {
    setFavoritesMessage(error.message || "Could not load favorite cities.");
  }
}

async function authenticate(endpoint, credentials, form) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.token) {
      const errors = Object.values(data.errors || {}).flat();
      throw new Error(errors[0] || data.message || "Could not sign in.");
    }

    localStorage.setItem("weather_api_token", data.token);
    localStorage.setItem("weather_api_user", JSON.stringify(data.user || {}));
    form.reset();
    syncAccountUI();
    setAuthMessage(endpoint === "register" ? "Account created." : "Signed in.", "success");
    await loadFavorites();
  } catch (error) {
    setAuthMessage(error.message || "Unable to connect to the account service.", "error");
  }
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const passwordConfirmation = registerPasswordConfirmation.value;

  if (!name || !email || !password || !passwordConfirmation) {
    setAuthMessage("Please fill in all registration fields.", "error");
    return;
  }

  if (password !== passwordConfirmation) {
    setAuthMessage("Passwords do not match.", "error");
    return;
  }

  await authenticate("register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  }, registerForm);
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await authenticate("login", {
    email: loginEmail.value.trim(),
    password: loginPassword.value,
  }, loginForm);
});

logoutButton?.addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error("Could not log out. Please try again.");
    }

    localStorage.removeItem("weather_api_token");
    localStorage.removeItem("weather_api_user");
    savedFavorites = [];
    syncAccountUI();
    setAuthMessage("Signed out.", "success");
  } catch (error) {
    setAuthMessage(error.message || "Unable to connect to the account service.", "error");
  }
});

favoriteCityButton?.addEventListener("click", async () => {
  const city = currentWeather?.location?.name;
  if (!city || !getAuthToken()) return;

  const existing = savedFavorites.find((item) => item.city.toLowerCase() === city.toLowerCase());

  try {
    if (existing) {
      await removeFavorite(existing);
      return;
    } else {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ city }),
      });
      const favorite = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(favorite.message || "Could not save this city.");
      savedFavorites.push(favorite);
      setFavoritesMessage("City saved to favorites.");
    }

    renderFavorites();
  } catch (error) {
    setFavoritesMessage(error.message || "Could not update favorite cities.");
  }
});

syncAccountUI();
if (getAuthToken()) {
  loadFavorites();
}

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
  currentWeather = data;
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
  syncFavoriteButton();
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
