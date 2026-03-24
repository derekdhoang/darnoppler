// ── DOM REFERENCES ────────────────────────────────────────────────────
const cityInput           = document.getElementById('city-input');
const searchBtn           = document.getElementById('search-btn');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
const screenshotPanel     = document.getElementById('screenshot-panel');
const forecastGrid        = document.getElementById('forecast-grid');
const errorMessage        = document.getElementById('error-message');
const cityNameEl          = document.getElementById('city-name');
const weatherDesc         = document.getElementById('weather-desc');
const weatherIcon         = document.getElementById('weather-icon');
const weatherScene        = document.getElementById('weather-scene');
const weatherDateBar      = document.getElementById('weather-date-bar');
const holidayBar          = document.getElementById('holiday-bar');
const temperature         = document.getElementById('temperature');
const feelsLike           = document.getElementById('feels-like');
const humidity            = document.getElementById('humidity');
const uvIndex             = document.getElementById('uv-index');
const wind                = document.getElementById('wind');
const visibility          = document.getElementById('visibility');
const dewPoint            = document.getElementById('dew-point');
const todayHigh           = document.getElementById('today-high');
const todayLow            = document.getElementById('today-low');
const tempMorn            = document.getElementById('temp-morn');
const tempEve             = document.getElementById('temp-eve');
const tempNight           = document.getElementById('temp-night');
const windGust            = document.getElementById('wind-gust');
const rainVol             = document.getElementById('rain-vol');
const snowVol             = document.getElementById('snow-vol');
const expandPanel         = document.getElementById('expand-panel');
const weatherCard         = document.getElementById('weather-card');


// ── API ENDPOINTS ─────────────────────────────────────────────────────
const GEO_URL      = 'https://api.openweathermap.org/geo/1.0/direct';
const ONE_CALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';


// ── STATE ─────────────────────────────────────────────────────────────
let debounceTimer      = null;
let selectedIndex      = -1;
let currentSuggestions = [];


// ── HOLIDAY DATA ──────────────────────────────────────────────────────
const HOLIDAYS = {
  '01-01': { name: "New Year's Day",    emoji: '🎆' },
  '01-15': { name: 'MLK Day',           emoji: '✊' },
  '02-14': { name: "Valentine's Day",   emoji: '❤️' },
  '03-17': { name: "St. Patrick's Day", emoji: '🍀' },
  '04-01': { name: "April Fools'",      emoji: '🤡' },
  '05-05': { name: 'Cinco de Mayo',     emoji: '🌮' },
  '05-26': { name: 'Memorial Day',      emoji: '🎖️' },
  '06-19': { name: 'Juneteenth',        emoji: '✊' },
  '07-04': { name: 'Independence Day',  emoji: '🎇' },
  '09-01': { name: 'Labor Day',         emoji: '🔨' },
  '10-31': { name: 'Halloween',         emoji: '🎃' },
  '11-11': { name: 'Veterans Day',      emoji: '🎖️' },
  '11-27': { name: 'Thanksgiving',      emoji: '🦃' },
  '12-24': { name: 'Christmas Eve',     emoji: '🎄' },
  '12-25': { name: 'Christmas Day',     emoji: '🎁' },
  '12-31': { name: "New Year's Eve",    emoji: '🥂' },
};


// ── ICON MAPPING ──────────────────────────────────────────────────────
function getIconPath(iconCode) {
  const map = {
    '01d': 'clear-day.svg',
    '01n': 'clear-night.svg',
    '02d': 'partly-cloudy-day.svg',
    '02n': 'partly-cloudy-night.svg',
    '03d': 'partly-cloudy-day.svg',
    '03n': 'partly-cloudy-night.svg',
    '04d': 'overcast-day.svg',
    '04n': 'overcast-night.svg',
    '09d': 'drizzle.svg',
    '09n': 'drizzle.svg',
    '10d': 'rain.svg',
    '10n': 'rain.svg',
    '11d': 'thunderstorms-day-rain.svg',
    '11n': 'thunderstorms-night-rain.svg',
    '13d': 'snow.svg',
    '13n': 'snow.svg',
    '50d': 'mist.svg',
    '50n': 'mist.svg',
  };

  return `icons/${map[iconCode] || 'not-available.svg'}`;
}


// ── UTILITY FUNCTIONS ─────────────────────────────────────────────────

function getHoliday(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return HOLIDAYS[`${month}-${day}`] || null;
}

function formatDayLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function debounce(func, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, delay);
}


// ── AUTOCOMPLETE ──────────────────────────────────────────────────────

async function fetchSuggestions(query) {
  if (query.length < 2) { hideSuggestions(); return; }

  try {
    const res  = await fetch(
      `${GEO_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${config.apiKey}`
    );
    const data = await res.json();
    currentSuggestions = data;
    selectedIndex = -1;
    renderSuggestions(data);
  } catch {
    hideSuggestions();
  }
}

function renderSuggestions(suggestions) {
  suggestionsDropdown.innerHTML = '';
  if (!suggestions.length) { hideSuggestions(); return; }

  suggestions.forEach((place) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = place.state
      ? `${place.name}, ${place.state}, ${place.country}`
      : `${place.name}, ${place.country}`;

    item.addEventListener('click', () => {
      cityInput.value = item.textContent;
      hideSuggestions();
      fetchWeather(place.lat, place.lon, place.name, place.state, place.country);
    });

    suggestionsDropdown.appendChild(item);
  });

  suggestionsDropdown.classList.add('open');
}

function hideSuggestions() {
  suggestionsDropdown.classList.remove('open');
  suggestionsDropdown.innerHTML = '';
  selectedIndex = -1;
}


// ── FETCH WEATHER ─────────────────────────────────────────────────────

async function fetchWeather(lat, lon, city, state, country) {
  errorMessage.textContent = '';
  searchBtn.textContent = 'Loading...';
  searchBtn.disabled = true;

  // Step 1: Geocode if we don't have coordinates yet
  if (!lat || !lon) {
    try {
      const geoRes  = await fetch(
        `${GEO_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${config.apiKey}`
      );
      const geoData = await geoRes.json();

      if (!geoData.length) throw new Error('City not found');

      lat     = geoData[0].lat;
      lon     = geoData[0].lon;
      city    = geoData[0].name;
      state   = geoData[0].state;
      country = geoData[0].country;

    } catch {
      errorMessage.textContent = 'City not found. Try again.';
      searchBtn.textContent = 'Search';
      searchBtn.disabled = false;
      return;
    }
  }

  try {
    const res = await fetch(
      `${ONE_CALL_URL}?lat=${lat}&lon=${lon}&units=imperial&exclude=minutely,hourly,alerts&appid=${config.apiKey}`
    );

    if (!res.ok) {
      if (res.status === 401) throw new Error('API key not subscribed to One Call 3.0');
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();

    renderCurrent(data.current, data.daily[0], city, state, country);

    renderForecast(data.daily.slice(1, 7));

    screenshotPanel.hidden = false;

  } catch (err) {
    errorMessage.textContent = err.message || 'Something went wrong. Please try again.';
  } finally {
    searchBtn.textContent = 'Search';
    searchBtn.disabled = false;
  }
}


// ── RENDER CURRENT WEATHER ────────────────────────────────────────────

function renderCurrent(current, today, city, state, country) {

  weatherDateBar.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric'
  }).toUpperCase();

  localStorage.setItem('lastCity', city);

  const todayHoliday = getHoliday(new Date());
  if (todayHoliday) {
    holidayBar.textContent = `${todayHoliday.emoji} ${todayHoliday.name}`;
    holidayBar.hidden = false;
  } else {
    holidayBar.hidden = true;
  }

  const iconCode = current.weather[0].icon;
  weatherScene.innerHTML = `
    <img
      src="${getIconPath(iconCode)}"
      alt="${current.weather[0].description}"
    >
  `;

  cityNameEl.textContent  = state
    ? `${city}, ${state}, ${country}`
    : `${city}, ${country}`;
  weatherDesc.textContent = current.weather[0].description;

  weatherIcon.innerHTML = `
    <img
      src="${getIconPath(iconCode)}"
      alt="${current.weather[0].description}"
    >
  `;

  temperature.textContent = Math.round(current.temp);
  feelsLike.textContent   = Math.round(current.feels_like) + '°F';
  humidity.textContent    = current.humidity + '%';
  uvIndex.textContent     = Math.round(current.uvi);
  wind.textContent        = Math.round(current.wind_speed) + ' mph';
  visibility.textContent  = current.visibility
    ? (current.visibility / 1609).toFixed(1) + ' mi'
    : 'N/A';
  dewPoint.textContent    = Math.round(current.dew_point) + '°F';

  todayHigh.textContent = Math.round(today.temp.max) + '°F';
  todayLow.textContent  = Math.round(today.temp.min) + '°F';

  tempMorn.textContent  = Math.round(today.temp.morn)  + '°F';
  tempEve.textContent   = Math.round(today.temp.eve)   + '°F';
  tempNight.textContent = Math.round(today.temp.night) + '°F';
  windGust.textContent  = today.wind_gust
    ? Math.round(today.wind_gust) + ' mph'
    : 'N/A';
  rainVol.textContent = today.rain
    ? (today.rain * 0.03937).toFixed(2) + ' in'
    : '0.0 in';
  snowVol.textContent = today.snow
   ? (today.snow * 0.03937).toFixed(2) + ' in'
   : '0.0 in'
}


// ── RENDER FORECAST ───────────────────────────────────────────────────

function renderForecast(dailyData) {
  forecastGrid.innerHTML = '';
  dailyData.forEach((day, index) => {
    forecastGrid.appendChild(buildForecastCard(day, index));
  });
}


// ── BUILD FORECAST CARD ───────────────────────────────────────────────

function buildForecastCard(day, index) {
  const raw       = new Date(day.dt * 1000);
  const date      = new Date(raw.toLocaleDateString('en-US'));
  const dayLabel  = formatDayLabel(date);
  const dateLabel = formatDateLabel(date);
  const high      = Math.round(day.temp.max);
  const low       = Math.round(day.temp.min);
  const pop       = Math.round(day.pop * 100);
  const iconCode  = day.weather[0].icon;
  const iconUrl   = getIconPath(iconCode);
  const description = day.weather[0].description;
  const holiday   = getHoliday(date);

  const card = document.createElement('div');
  card.className = 'forecast-card';
  card.style.animationDelay = `${index * 70}ms`;

  card.innerHTML = `
    ${holiday
      ? `<div class="holiday-badge">${holiday.emoji} ${holiday.name}</div>`
      : ''
    }
    <div class="forecast-day">${dayLabel}</div>
    <div class="forecast-date">${dateLabel}</div>
    <img
      class="forecast-icon"
      src="${iconUrl}"
      alt="${description}"
      loading="lazy"
    >
    <div class="forecast-description">${description}</div>
    <div class="forecast-temps">
      <span class="forecast-high">${high}°</span>
      <span class="forecast-sep">/</span>
      <span class="forecast-low">${low}°</span>
    </div>
    ${pop > 0
      ? `<div class="forecast-precip">💧 ${pop}%</div>`
      : `<div class="forecast-precip-empty"></div>`
    }
  `;

  return card;
}


// ── EVENT LISTENERS ───────────────────────────────────────────────────

searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (!city) return;
  hideSuggestions();
  fetchWeather(null, null, city);
});

cityInput.addEventListener('input', () => {
  debounce(() => fetchSuggestions(cityInput.value.trim()), 300);
});

cityInput.addEventListener('keydown', (e) => {
  const items = suggestionsDropdown.querySelectorAll('.suggestion-item');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    items.forEach((item, i) => item.classList.toggle('active', i === selectedIndex));

  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, -1);
    items.forEach((item, i) => item.classList.toggle('active', i === selectedIndex));

  } else if (e.key === 'Enter') {
    if (selectedIndex >= 0 && currentSuggestions[selectedIndex]) {
      const place = currentSuggestions[selectedIndex];
      cityInput.value = place.state
        ? `${place.name}, ${place.state}, ${place.country}`
        : `${place.name}, ${place.country}`;
      hideSuggestions();
      fetchWeather(place.lat, place.lon, place.name, place.state, place.country);
    } else {
      const city = cityInput.value.trim();
      if (!city) return;
      hideSuggestions();
      fetchWeather(null, null, city);
    }
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) hideSuggestions();
});

weatherCard.addEventListener('click', () => {
  weatherCard.classList.toggle('expanded');
  expandPanel.classList.toggle('open');
});


// ── SEASONAL THEME ────────────────────────────────────────────────────

function applySeasonalTheme() {
  const month = new Date().getMonth();
  let gradient;

  if (month >= 2 && month <= 4) {
    // Spring
    gradient = 'linear-gradient(135deg, #1a3a2a 0%, #2d6b4a 40%, #6b4a7a 100%)';
  } else if (month >= 5 && month <= 7) {
    // Summer
    gradient = 'linear-gradient(135deg, #1a2e4a 0%, #1a5a8e 50%, #7e3a10 100%)';
  } else if (month >= 8 && month <= 10) {
    // Fall
    gradient = 'linear-gradient(135deg, #4a1a00 0%, #8b3a10 40%, #2a1a4a 100%)';
  } else {
    // Winter
    gradient = 'linear-gradient(135deg, #0a1a2e 0%, #2a2a5a 50%, #1a3a5a 100%)';
  }

  document.body.style.background = gradient;
}


// ── INIT ──────────────────────────────────────────────────────────────
applySeasonalTheme();
fetchWeather(null, null, localStorage.getItem('lastCity') || config.defaultCity);