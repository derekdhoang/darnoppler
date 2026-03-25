// =====================================================================
// DARNOPPLER'S FORECAST — app.js
// Powered by Open-Meteo (open-meteo.com)
//

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

const GEO_URL      = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';


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


// ── WMO WEATHER CODE → METEOCONS ICON ─────────────────────────────────

function getIconPath(wmoCode, isDay) {
  const day = isDay === 1;

  const map = {
    0:  day ? 'clear-day.svg'                  : 'clear-night.svg',
    1:  day ? 'partly-cloudy-day.svg'          : 'partly-cloudy-night.svg',
    2:  day ? 'partly-cloudy-day.svg'          : 'partly-cloudy-night.svg',
    3:  day ? 'overcast-day.svg'               : 'overcast-night.svg',
    45: 'mist.svg',
    48: 'mist.svg',
    51: 'drizzle.svg',
    53: 'drizzle.svg',
    55: 'drizzle.svg',
    61: 'rain.svg',
    63: 'rain.svg',
    65: 'rain.svg',
    71: 'snow.svg',
    73: 'snow.svg',
    75: 'snow.svg',
    77: 'snow.svg',
    80: 'rain.svg',
    81: 'rain.svg',
    82: 'rain.svg',
    85: 'snow.svg',
    86: 'snow.svg',
    95: day ? 'thunderstorms-day-rain.svg'     : 'thunderstorms-night-rain.svg',
    96: day ? 'thunderstorms-day-rain.svg'     : 'thunderstorms-night-rain.svg',
    99: day ? 'thunderstorms-day-rain.svg'     : 'thunderstorms-night-rain.svg',
  };

  return `icons/${map[wmoCode] !== undefined ? map[wmoCode] : 'not-available.svg'}`;
}


// ── WMO CODE → READABLE DESCRIPTION ───────────────────────────────────

function getWeatherDescription(wmoCode) {
  const descriptions = {
    0:  'Clear Sky',
    1:  'Mainly Clear',
    2:  'Partly Cloudy',
    3:  'Overcast',
    45: 'Foggy',
    48: 'Icy Fog',
    51: 'Light Drizzle',
    53: 'Drizzle',
    55: 'Heavy Drizzle',
    61: 'Light Rain',
    63: 'Rain',
    65: 'Heavy Rain',
    71: 'Light Snow',
    73: 'Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Light Showers',
    81: 'Showers',
    82: 'Heavy Showers',
    85: 'Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Heavy Hail',
  };
  return descriptions[wmoCode] || 'Unknown';
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
      `${GEO_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );
    const data = await res.json();

    // Open-Meteo returns { results: [...] } or {} if nothing found
    const results = data.results || [];
    currentSuggestions = results;
    selectedIndex = -1;
    renderSuggestions(results);
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

    // Open-Meteo uses admin1 for state/region and country_code for country
    item.textContent = place.admin1
      ? `${place.name}, ${place.admin1}, ${place.country_code}`
      : `${place.name}, ${place.country_code}`;

    item.addEventListener('click', () => {
      cityInput.value = item.textContent;
      hideSuggestions();
      // Open-Meteo uses latitude/longitude instead of lat/lon
      fetchWeather(place.latitude, place.longitude, place.name, place.admin1, place.country_code);
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
        `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || !geoData.results.length) {
        throw new Error('City not found');
      }

      const place = geoData.results[0];
      lat     = place.latitude;
      lon     = place.longitude;
      city    = place.name;
      state   = place.admin1;
      country = place.country_code;

    } catch {
      errorMessage.textContent = 'City not found. Try again.';
      searchBtn.textContent = 'Search';
      searchBtn.disabled = false;
      return;
    }
  }

  try {
 
    const res = await fetch(
      `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
      `&temperature_unit=fahrenheit` +
      `&wind_speed_unit=mph` +
      `&precipitation_unit=inch` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index,is_day,visibility,dew_point_2m,precipitation` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&forecast_days=7` +
      `&timezone=auto`
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();

    renderCurrent(data.current, data.daily, city, state, country);

    renderForecast(data.daily, 1);

    screenshotPanel.hidden = false;

  } catch (err) {
    errorMessage.textContent = err.message || 'Something went wrong. Please try again.';
  } finally {
    searchBtn.textContent = 'Search';
    searchBtn.disabled = false;
  }
}


// ── RENDER CURRENT WEATHER ────────────────────────────────────────────

function renderCurrent(current, daily, city, state, country) {

  // Date bar
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

  const wmoCode   = current.weather_code;
  const isDay     = current.is_day;
  const iconPath  = getIconPath(wmoCode, isDay);
  const desc      = getWeatherDescription(wmoCode);

  weatherScene.innerHTML = `
    <img src="${iconPath}" alt="${desc}">
  `;

  cityNameEl.textContent  = state
    ? `${city}, ${state}, ${country}`
    : `${city}, ${country}`;
  weatherDesc.textContent = desc;

  weatherIcon.innerHTML = `
    <img src="${iconPath}" alt="${desc}">
  `;

  temperature.textContent = Math.round(current.temperature_2m);
  feelsLike.textContent   = Math.round(current.apparent_temperature) + '°F';
  humidity.textContent    = current.relative_humidity_2m + '%';
  uvIndex.textContent     = Math.round(current.uv_index);
  wind.textContent        = Math.round(current.wind_speed_10m) + ' mph';
  visibility.textContent  = current.visibility
    ? (current.visibility / 1609).toFixed(1) + ' mi'
    : 'N/A';
  dewPoint.textContent    = Math.round(current.dew_point_2m) + '°F';

  todayHigh.textContent = Math.round(daily.temperature_2m_max[0]) + '°F';
  todayLow.textContent  = Math.round(daily.temperature_2m_min[0]) + '°F';

  tempMorn.textContent  = Math.round(daily.temperature_2m_min[0])        + '°F';
  tempEve.textContent   = Math.round(daily.apparent_temperature_max[0])  + '°F';
  tempNight.textContent = Math.round(daily.temperature_2m_min[0])        + '°F';

  const isSnowCondition = [71, 73, 75, 77, 85, 86].includes(daily.weather_code[0]);
  const isRainCondition = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(daily.weather_code[0]);
  const precipChance    = daily.precipitation_probability_max[0] || 0;

  windGust.textContent = precipChance + '%';

  rainVol.textContent = daily.precipitation_sum[0]
    ? daily.precipitation_sum[0].toFixed(2) + ' in'
    : '0.00 in';

  snowVol.textContent = isSnowCondition ? '❄️ Snow' : isRainCondition ? '💧 Rain' : '—';
}


// ── RENDER FORECAST ───────────────────────────────────────────────────

function renderForecast(daily, startIndex) {
  forecastGrid.innerHTML = '';

  for (let i = startIndex; i < startIndex + 6; i++) {
    const card = buildForecastCard(daily, i, i - startIndex);
    forecastGrid.appendChild(card);
  }
}


// ── BUILD FORECAST CARD ───────────────────────────────────────────────

function buildForecastCard(daily, i, animationIndex) {
  const date      = new Date(daily.time[i] + 'T12:00:00');
  const dayLabel  = formatDayLabel(date);
  const dateLabel = formatDateLabel(date);
  const high      = Math.round(daily.temperature_2m_max[i]);
  const low       = Math.round(daily.temperature_2m_min[i]);
  const pop       = daily.precipitation_probability_max[i] || 0;
  const wmoCode   = daily.weather_code[i];

  const isSnow = [71, 73, 75, 77, 85, 86].includes(wmoCode);
  const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(wmoCode);

  const iconPath    = getIconPath(wmoCode, 1);
  const description = getWeatherDescription(wmoCode);
  const holiday     = getHoliday(date);

  const card = document.createElement('div');
  card.className = 'forecast-card';
  card.style.animationDelay = `${animationIndex * 70}ms`;

  card.innerHTML = `
    ${holiday
      ? `<div class="holiday-badge">${holiday.emoji} ${holiday.name}</div>`
      : ''
    }
    <div class="forecast-day">${dayLabel}</div>
    <div class="forecast-date">${dateLabel}</div>
    <img
      class="forecast-icon"
      src="${iconPath}"
      alt="${description}"
      loading="lazy"
    >
    <div class="forecast-description">${description}</div>
    <div class="forecast-temps">
      <span class="forecast-high">${high}°</span>
      <span class="forecast-sep">/</span>
      <span class="forecast-low">${low}°</span>
    </div>
    ${pop > 0 && isSnow
      ? `<div class="forecast-precip">❄️ ${pop}%</div>`
      : pop > 0 && isRain
        ? `<div class="forecast-precip">💧 ${pop}%</div>`
        : pop > 0
          ? `<div class="forecast-precip">🌂 ${pop}%</div>`
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
      cityInput.value = place.admin1
        ? `${place.name}, ${place.admin1}, ${place.country_code}`
        : `${place.name}, ${place.country_code}`;
      hideSuggestions();
      fetchWeather(place.latitude, place.longitude, place.name, place.admin1, place.country_code);
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
    gradient = 'linear-gradient(135deg, #1a3a2a 0%, #2d6b4a 40%, #6b4a7a 100%)';
  } else if (month >= 5 && month <= 7) {
    gradient = 'linear-gradient(135deg, #1a2e4a 0%, #1a5a8e 50%, #7e3a10 100%)';
  } else if (month >= 8 && month <= 10) {
    gradient = 'linear-gradient(135deg, #4a1a00 0%, #8b3a10 40%, #2a1a4a 100%)';
  } else {
    gradient = 'linear-gradient(135deg, #0a1a2e 0%, #2a2a5a 50%, #1a3a5a 100%)';
  }

  document.body.style.background = gradient;
}


// ── INIT ──────────────────────────────────────────────────────────────

applySeasonalTheme();
fetchWeather(null, null, localStorage.getItem('lastCity') || config.defaultCity);