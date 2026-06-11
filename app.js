// =====================================================================
// DARNOPPLER'S FORECAST — app.js
// Powered by Pirate Weather (pirateweather.net)
// =====================================================================

// ── BACKGROUND — Real-time Iowa sky system ───────────────────────────

function getIowaHour() {
  const now = new Date();
  const iowa = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return iowa.getHours();
}

function getTimeOfDay(hour) {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function applyBackground(icon = '') {
  const hour = getIowaHour();
  const timeOfDay = getTimeOfDay(hour);

  const bgImage   = document.getElementById('bg-image');
  const bgOverlay = document.getElementById('bg-overlay');
  if (!bgImage || !bgOverlay) return;

  bgOverlay.className = 'bg-overlay ' + timeOfDay;

  // Determine if weather is rainy/stormy
  const isWet = icon.includes('rain') || icon.includes('drizzle') ||
                icon.includes('thunder') || icon.includes('sleet') ||
                icon.includes('hail');

  // Pick the right background image
  const bgMap = {
    morning: { clear: 'img/bg-morning.png', wet: 'img/bg-morning-rain.png' },
    day:     { clear: 'img/bg-day.png',     wet: 'img/bg-day-rain.png'     },
    evening: { clear: 'img/bg-evening.png', wet: 'img/bg-evening-rain.png' },
    night:   { clear: 'img/bg-night.png',   wet: 'img/bg-night-rain.png'   },
  };

  const chosen = bgMap[timeOfDay][isWet ? 'wet' : 'clear'];
  bgImage.style.backgroundImage = `url('${chosen}')`;
  bgImage.className = 'bg-image ' + timeOfDay + (isWet ? ' wet' : '');

  // Time-aware UI colors
  const root = document.documentElement;
  switch (timeOfDay) {
    case 'morning':
      root.style.setProperty('--time-accent', 'rgba(251,191,36,0.8)');
      root.style.setProperty('--time-kicker', '#fde68a');
      break;
    case 'day':
      root.style.setProperty('--time-accent', 'rgba(59,130,246,0.8)');
      root.style.setProperty('--time-kicker', 'rgba(255,248,220,0.95)');
      break;
    case 'evening':
      root.style.setProperty('--time-accent', 'rgba(234,88,12,0.8)');
      root.style.setProperty('--time-kicker', '#fb923c');
      break;
    case 'night':
      root.style.setProperty('--time-accent', 'rgba(99,102,241,0.8)');
      root.style.setProperty('--time-kicker', '#a5f3fc');
      break;
  }
}
// ── DOPPLER WALK SYSTEM ───────────────────────────────────────────────
function initDoppler() {
  const wrap = document.getElementById('doppler-wrap');
  if (!wrap) return;

  const spawnLeft = Math.random() < 0.5;

  if (spawnLeft) {
    wrap.style.left = '8%';
    wrap.style.right = 'auto';
    wrap.style.bottom = '28%';
    wrap.style.animation = 'doppler-walk-right 12s linear infinite';
  } else {
    wrap.style.right = '8%';
    wrap.style.left = 'auto';
    wrap.style.bottom = '25%';
    wrap.style.animation = 'doppler-walk-left 12s linear infinite';
  }
}

initDoppler();
applyBackground();

// ── DOM REFERENCES ────────────────────────────────────────────────────
const cityInput           = document.getElementById('city-input');
const searchBtn           = document.getElementById('search-btn');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
const errorMessage        = document.getElementById('error-message');
const cityNameEl          = document.getElementById('city-name');
const weatherDesc         = document.getElementById('weather-desc');
const weatherIcon         = document.getElementById('weather-icon');
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
const sunrise             = document.getElementById('sunrise');
const sunset              = document.getElementById('sunset');
const expandPanel         = document.getElementById('section-hourly');
const forecastGrid        = document.getElementById('forecast-grid');
const spcPanel            = document.getElementById('spc-panel');
const spcBadge            = document.getElementById('spc-badge');
const spcRiskLabel        = document.getElementById('spc-risk-label');
const spcDescription      = document.getElementById('spc-description');
const radarPanelTimestamp = document.getElementById('radar-panel-timestamp');
const tempPrecipHint      = document.getElementById('temp-precip-hint');
const periodMorn  = document.getElementById('period-morn');
const periodAftn  = document.getElementById('period-aftn');
const periodEve   = document.getElementById('period-eve');
const periodNight = document.getElementById('period-night');

// ── API ENDPOINTS ─────────────────────────────────────────────────────
const GEO_URL    = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_PROXY_URL = 'https://weather-proxy.derekdhoang.workers.dev';


// ── CONSTANTS ─────────────────────────────────────────────────────────
const RECENT_KEY  = 'darnoppler-recent-searches';
const RECENT_MAX  = 4;
const STORAGE_KEY = 'darnoppler-radar-drawings';

const IOWA_BOUNDS = {
  minLat: 40.37, maxLat: 43.50,
  minLon: -96.64, maxLon: -90.14,
};

function isInIowa(lat, lon) {
  return lat >= IOWA_BOUNDS.minLat && lat <= IOWA_BOUNDS.maxLat &&
         lon >= IOWA_BOUNDS.minLon && lon <= IOWA_BOUNDS.maxLon;
}

const IOWA_FIPS_CODE = '19';
const IOWA_NAME      = 'Iowa';


// ── STATE VARIABLES ───────────────────────────────────────────────────
let debounceTimer      = null;
let selectedIndex      = -1;
let currentSuggestions = [];
let previewMap         = null;
let previewRadar       = null;
let previewCityMarker  = null;
let previewDrawings    = null;
let hourlyChart        = null;
let hourlyOffset       = 0;
let storedHourly       = [];
let windLayer          = null;
let windEnabled        = true;
let windInitialized    = false;
let lastCityView       = null;
const WIND_URL         = 'https://tile-proxy.derekdhoang.workers.dev/wind';


// ── HOLIDAY DATA ──────────────────────────────────────────────────────

// Returns nth occurrence of a weekday in a given month/year.
// weekday: 0=Sun, 1=Mon ... 6=Sat. nth: 1-based. Use -1 for last.
function nthWeekday(year, month, weekday, nth) {
  if (nth === -1) {
    // Last occurrence: start from end of month
    const last = new Date(year, month + 1, 0); // last day of month
    const diff = (last.getDay() - weekday + 7) % 7;
    return new Date(year, month, last.getDate() - diff);
  }
  const first = new Date(year, month, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + diff + (nth - 1) * 7);
}

// Easter (Anonymous Gregorian algorithm)
function getEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function getHolidaysForYear(year) {
  const fmt = d => `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const holidays = {};

  // Fixed-date holidays
  holidays['01-01'] = "New Year's Day";
  holidays['02-14'] = "Valentine's Day";
  holidays['03-17'] = "St. Patrick's Day";
  holidays['04-01'] = "April Fools'";
  holidays['05-05'] = 'Cinco de Mayo';
  holidays['06-19'] = 'Juneteenth';
  holidays['07-04'] = 'Independence Day';
  holidays['10-31'] = 'Halloween';
  holidays['11-11'] = 'Veterans Day';
  holidays['12-24'] = 'Christmas Eve';
  holidays['12-25'] = 'Christmas Day';
  holidays['12-31'] = "New Year's Eve";

  // Floating holidays
  holidays[fmt(nthWeekday(year, 0, 1, 3))]  = 'MLK Day';           // 3rd Mon in Jan
  holidays[fmt(getEaster(year))]              = 'Easter';            // Easter Sunday
  holidays[fmt(nthWeekday(year, 4, 1, -1))]  = 'Memorial Day';      // Last Mon in May
  holidays[fmt(nthWeekday(year, 8, 1, 1))]   = 'Labor Day';         // 1st Mon in Sep
  holidays[fmt(nthWeekday(year, 10, 4, 4))]  = 'Thanksgiving';      // 4th Thu in Nov

  return holidays;
}


// ── SPC DATA ──────────────────────────────────────────────────────────
const SPC_RISKS = {
  'TSTM': { label: 'General Thunder',  color: '#c5e8c5', text: '#1a3a1a' },
  'MRGL': { label: 'Marginal Risk',    color: '#4daf4d', text: '#ffffff' },
  'SLGT': { label: 'Slight Risk',      color: '#f0f04d', text: '#333300' },
  'ENH':  { label: 'Enhanced Risk',    color: '#e8a032', text: '#ffffff' },
  'MDT':  { label: 'Moderate Risk',    color: '#e84040', text: '#ffffff' },
  'HIGH': { label: 'High Risk',        color: '#ff40ff', text: '#ffffff' },
};

const SPC_DESCRIPTIONS = {
  'TSTM': 'General thunderstorm activity possible in this area.',
  'MRGL': 'Isolated severe storms possible. Marginal risk for damaging winds or hail.',
  'SLGT': 'Scattered severe storms possible. Slight risk for damaging winds, large hail, or tornadoes.',
  'ENH':  'Numerous severe storms likely. Enhanced risk for significant damaging winds, large hail, and tornadoes.',
  'MDT':  'Widespread severe storms expected. Moderate risk for significant tornadoes and damaging winds.',
  'HIGH': 'Particularly dangerous situation. High risk for violent tornadoes and extremely damaging winds.',
};

const ACTIVE_RISKS = new Set(['MRGL', 'SLGT', 'ENH', 'MDT', 'HIGH']);


// ── ICON MAPPING ──────────────────────────────────────────────────────
function getIconPath(icon) {
  const map = {
    'clear-day':           'clear-day.svg',
    'clear-night':         'clear-night.svg',
    'partly-cloudy-day':   'partly-cloudy-day.svg',
    'partly-cloudy-night': 'partly-cloudy-night.svg',
    'cloudy':              'overcast-day.svg',
    'rain':                'rain.svg',
    'drizzle':             'drizzle.svg',
    'sleet':               'sleet.svg',
    'snow':                'snow.svg',
    'wind':                'wind.svg',
    'fog':                 'mist.svg',
    'thunderstorm':        'thunderstorms.svg',
  };
  return `icons/${map[icon] || 'not-available.svg'}`;
}

function getIconDescription(icon) {
  const descriptions = {
    'clear-day':           'Clear Sky',
    'clear-night':         'Clear Sky',
    'partly-cloudy-day':   'Partly Cloudy',
    'partly-cloudy-night': 'Partly Cloudy',
    'cloudy':              'Cloudy',
    'rain':                'Rain',
    'drizzle':             'Drizzle',
    'sleet':               'Sleet',
    'snow':                'Snow',
    'wind':                'Windy',
    'fog':                 'Foggy',
  };
  return descriptions[icon] || 'Unknown';
}


// ── DOPPLER OUTFIT SWAP ───────────────────────────────────────────────
function updateDopplerOutfit(icon, tempF, windSpeedMph) {
  const el = document.getElementById('doppler-svg');
  if (!el) return;

  let outfit = 'doppler-base.png';

  // Priority order: cold > rainy/storm > windy > sunny > night > base
  if (tempF < 35) {
    outfit = 'doppler-cold.png';
  } else if (icon === 'thunderstorm' || icon === 'rain' || icon === 'drizzle' || icon === 'sleet') {
    outfit = 'doppler-rainy.png';
  } else if (windSpeedMph > 20) {
    outfit = 'doppler-windy.png';
  } else if (tempF >= 80 && (icon === 'clear-day' || icon === 'partly-cloudy-day')) {
    outfit = 'doppler-sunny.png';
  } else if (icon === 'clear-night' || icon === 'partly-cloudy-night') {
    outfit = 'doppler-night.png';
  }

  el.src = `img/${outfit}`;
}

function getHoliday(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  const holidays = getHolidaysForYear(year);
  const name = holidays[`${month}-${day}`];
  return name ? { name } : null;
}

function formatDayLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatHourLabel(date) {
  const hr = date.getHours();
  if (hr === 0)  return '12am';
  if (hr === 12) return '12pm';
  return hr < 12 ? `${hr}am` : `${hr - 12}pm`;
}

function debounce(func, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, delay);
}


// ── RECENT SEARCHES ───────────────────────────────────────────────────
// Stores lat/lon — clicking a recent search bypasses geocoding entirely.
function saveRecentSearch(city, state, country, lat, lon, isDefault = false) {
  if (!city) return;
  if (isDefault && city.trim().toLowerCase() === 'iowa city') return;
  const label = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
  let recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  recents = recents.filter(r => r.label !== label);
  recents.unshift({ label, city, state, country, lat, lon });
  recents = recents.slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}

function showRecentSearches() {
  const recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  if (!recents.length) return;

  suggestionsDropdown.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 18px 4px;';
  header.innerHTML = `
    <span style="font-size:0.62rem;font-weight:700;letter-spacing:0.12em;
      text-transform:uppercase;color:rgba(255,255,255,0.3);">Recent</span>
    <button id="clear-recents-btn" style="background:none;border:none;
      color:rgba(255,255,255,0.3);font-size:0.7rem;cursor:pointer;
      padding:2px 6px;border-radius:4px;transition:color 0.15s;">Clear All</button>
  `;
  suggestionsDropdown.appendChild(header);

  const clearBtn = header.querySelector('#clear-recents-btn');
  clearBtn.addEventListener('mouseenter', () => clearBtn.style.color = 'rgba(255,255,255,0.7)');
  clearBtn.addEventListener('mouseleave', () => clearBtn.style.color = 'rgba(255,255,255,0.3)');
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.removeItem(RECENT_KEY);
    hideSuggestions();
  });

  recents.forEach((recent, idx) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-right:4px;';
    item.innerHTML = `
      <span style="flex:1;cursor:pointer;">${recent.label}</span>
      <button class="remove-recent-btn" style="background:none;border:none;
        color:rgba(255,255,255,0.25);font-size:0.8rem;cursor:pointer;
        padding:4px 8px;flex-shrink:0;border-radius:50%;width:26px;height:26px;
        display:flex;align-items:center;justify-content:center;
        transition:background 0.15s,color 0.15s;">✕</button>
    `;

    const xBtn = item.querySelector('.remove-recent-btn');
    xBtn.addEventListener('mouseenter', () => {
      xBtn.style.background = 'rgba(255,255,255,0.12)';
      xBtn.style.color      = 'rgba(255,255,255,0.7)';
    });
    xBtn.addEventListener('mouseleave', () => {
      xBtn.style.background = 'none';
      xBtn.style.color      = 'rgba(255,255,255,0.25)';
    });

    item.querySelector('span').addEventListener('click', () => {
      cityInput.value = '';
      hideSuggestions();
      fetchWeather(recent.lat || null, recent.lon || null, recent.city, recent.state, recent.country);
    });

    xBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let r2 = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      r2 = r2.filter(r => r.label !== recent.label);
      localStorage.setItem(RECENT_KEY, JSON.stringify(r2));
      item.remove();
      const remaining = suggestionsDropdown.querySelectorAll('.suggestion-item');
      if (!remaining.length) hideSuggestions();
    });

    suggestionsDropdown.appendChild(item);
  });

  suggestionsDropdown.classList.add('open');
}


// ── AUTOCOMPLETE ──────────────────────────────────────────────────────
async function fetchSuggestions(query) {
  if (query.length < 2) { hideSuggestions(); return; }
  try {
    const res  = await fetch(`${GEO_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const data = await res.json();
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
    item.textContent = place.admin1
      ? `${place.name}, ${place.admin1}, ${place.country_code}`
      : `${place.name}, ${place.country_code}`;
    item.addEventListener('click', () => {
      cityInput.value = '';
      hideSuggestions();
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
  hourlyOffset = 0;
  errorMessage.textContent = '';
  searchBtn.textContent = 'Loading...';
  searchBtn.disabled = true;

  if (!lat || !lon) {
    try {
      const geoRes  = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results || !geoData.results.length) throw new Error('City not found');
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
    const res = await fetch(`${WEATHER_PROXY_URL}/?lat=${lat}&lon=${lon}`);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Weather proxy auth error — check Worker secret');
      throw new Error(`API error: ${res.status}`);
    }
    const data = await res.json();

    renderCurrent(data.currently, data.daily.data[0], data.hourly.data, city, state, country, lat, lon);
    renderForecast(data.daily.data.slice(1, 8), data.hourly.data);

    // Update last updated timestamp
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
      lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
      });
    }

    cityInput.value = '';

    // Check if location is in USA
    const isUSA = country === 'United States' || country === 'USA' || country === 'US';
    
    if (isUSA) {
      initRadarPreview();
      updatePreviewCityMarker(city, lat, lon);
      loadDrawingsOntoPreview();

      if (isInIowa(lat, lon)) {
        fetchSPCOutlook(lat, lon);
      } else {
        spcPanel.hidden = true;
      }
    } else {
      spcPanel.hidden = true;
    }

  } catch (err) {
    if (err.message && !err.message.includes('404') && !err.message.includes('tiles')) {
      errorMessage.textContent = err.message || 'Something went wrong. Please try again.';
    }
  } finally {
    searchBtn.textContent = 'Search';
    searchBtn.disabled = false;
  }
}


// ── PRECIP HINT ───────────────────────────────────────────────────────
function renderTodayPrecipHint(todayData) {
  const pop    = Math.round((todayData.precipProbability || 0) * 100);
  const type   = todayData.precipType || '';
  const isSnow = type === 'snow' || type === 'sleet';

  if (pop > 10) {
    const icon  = isSnow ? 'icons/snow.svg' : 'icons/drizzle.svg';
    const label = isSnow ? 'snow' : 'rain';
    tempPrecipHint.innerHTML = `
      <img src="${icon}" alt="${label}"
        style="width:20px;height:20px;vertical-align:middle;
        filter:brightness(0) invert(1);opacity:0.85;">
      <span>${pop}%</span>
    `;
  } else {
    tempPrecipHint.innerHTML = '';
  }
}


// ── RENDER CURRENT WEATHER ────────────────────────────────────────────
function renderCurrent(current, today, hourlyData, city, state, country, lat, lon) {
  weatherDateBar.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).toUpperCase();

  localStorage.setItem('lastCity', city);
  saveRecentSearch(city, state, country, lat, lon, true);

  const todayHoliday = getHoliday(new Date());
  if (todayHoliday) {
    holidayBar.textContent = todayHoliday.name;
    holidayBar.hidden = false;
  } else {
    holidayBar.hidden = true;
  }

  const icon     = current.icon;
  const iconPath = getIconPath(icon);
  const desc     = current.summary || getIconDescription(icon);

  cityNameEl.textContent  = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
  weatherDesc.textContent = desc;
  weatherIcon.innerHTML   = `<img src="${iconPath}" alt="${desc}">`;

  temperature.textContent = Math.round(current.temperature);
  feelsLike.textContent   = Math.round(current.apparentTemperature) + '°F';
  humidity.textContent    = Math.round(current.humidity * 100) + '%';
  uvIndex.textContent     = Math.round(current.uvIndex);
  wind.textContent        = Math.round(current.windSpeed) + ' mph';
  visibility.textContent  = current.visibility ? current.visibility.toFixed(1) + ' mi' : 'N/A';
  dewPoint.textContent    = Math.round(current.dewPoint) + '°F';
  todayHigh.textContent   = Math.round(today.temperatureHigh) + '°F';
  todayLow.textContent    = Math.round(today.temperatureLow)  + '°F';

  // Wind Gusts
  const windGustEl = document.getElementById('wind-gust');
  if (windGustEl) {
    const gust = current.windGust || today.windGust;
    windGustEl.textContent = gust ? Math.round(gust) + ' mph' : 'N/A';
  }

  // Barometric Pressure
  const pressureEl = document.getElementById('pressure');
  if (pressureEl) {
    pressureEl.textContent = current.pressure ? current.pressure.toFixed(1) + ' mb' : 'N/A';
  }

  updateDopplerOutfit(icon, Math.round(current.temperature), Math.round(current.windSpeed));
  applyBackground(icon);

  renderTodayPrecipHint(today);
  renderLiveDigest(current, today, hourlyData);
  renderHourlyChart(hourlyData);
}


// ── LIVE DIGEST STRIP ────────────────────────────────────────────────
function renderLiveDigest(current, today, hourlyData) {
  const kickerEl   = document.getElementById('live-digest-kicker');
  const summaryEl  = document.getElementById('live-digest-summary');
  const sunriseEl  = document.getElementById('digest-sunrise');
  const sunsetEl   = document.getElementById('digest-sunset');
  if (!kickerEl) return;

  const tod    = getTimeOfDay(getIowaHour());
  const icon   = current.icon;
  const high   = Math.round(today.temperatureHigh);
  const low    = Math.round(today.temperatureLow);
  const wind   = Math.round(current.windSpeed || 0);
  const windD  = getWindDirection(current.windBearing || 0);
  const gust   = Math.round(current.windGust || wind);
  const pop    = Math.round((today.precipProbability || 0) * 100);
  const humid  = Math.round((current.humidity || 0) * 100);
  const uv     = Math.round(current.uvIndex || 0);

  const labels = {
    morning: 'This Morning',
    day:     'This Afternoon',
    evening: 'This Evening',
    night:   'Tonight',
  };
  const kicker = labels[tod];
  kickerEl.textContent = kicker;

  const isNight = tod === 'night' || tod === 'evening';
  let summary = '';

  if (isNight) {
    if (icon.includes('thunder')) summary = `Storms possible through the overnight hours`;
    else if (icon.includes('snow')) summary = `Snow conditions heading into the night`;
    else if (icon.includes('rain') || icon.includes('drizzle')) summary = `Wet conditions overnight — keep the umbrella close`;
    else if (icon.includes('clear')) summary = `Clear skies will hold through the overnight hours`;
    else if (icon.includes('cloudy')) summary = `Cloudy skies overnight`;
    else summary = `Conditions tonight look ${getIconDescription(icon).toLowerCase()}`;

    if (low <= 32) summary += `. Temperatures plunge to a frigid ${low}°`;
    else if (low <= 45) summary += `. Temperatures will cool into the ${low}s`;
    else summary += `. Overnight low settles around ${low}°`;

    if (pop >= 50) summary += ` with a ${pop}% chance of precipitation`;
    if (wind >= 20) summary += `. Winds ${wind} mph ${windD}`;
    else if (wind <= 5) summary += `. Calm winds overnight`;
  } else {
    if (icon.includes('thunder')) summary = `Thunderstorm risk in the area — stay weather aware`;
    else if (icon.includes('snow')) summary = `Snow expected today`;
    else if (icon.includes('rain') || icon.includes('drizzle')) summary = `A wet one today`;
    else if (icon.includes('clear')) summary = `Beautiful clear conditions today`;
    else if (icon.includes('cloudy')) summary = `Mostly cloudy skies today`;
    else summary = `Conditions today look ${getIconDescription(icon).toLowerCase()}`;

    if (high >= 90) summary += `. Hot — high of ${high}°, stay hydrated`;
    else if (high >= 80) summary += `. A warm high of ${high}°`;
    else if (high <= 32) summary += `. Frigid — high of only ${high}°`;
    else summary += `. High of ${high}°, low tonight around ${low}°`;

    if (pop >= 50) summary += ` with a ${pop}% chance of rain`;
    if (wind >= 25) { summary += `. Very windy at ${wind} mph ${windD}`; if (gust > wind + 5) summary += `, gusting to ${gust} mph`; }
    else if (wind >= 15) summary += `. Winds ${wind} mph out of the ${windD}`;
    else if (wind <= 5) summary += `. Calm winds keep things comfortable`;
    if (uv >= 8 && !isNight) summary += `. High UV index of ${uv} — sunscreen recommended`;
    if (humid >= 80 && high >= 75) summary += `. Feels muggy at ${humid}% humidity`;
  }

  summaryEl.textContent = summary + '.';

  if (today.sunriseTime && sunriseEl) {
    sunriseEl.textContent = new Date(today.sunriseTime * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (today.sunsetTime && sunsetEl) {
    sunsetEl.textContent = new Date(today.sunsetTime * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}


// ── RENDER FORECAST ───────────────────────────────────────────────────
function renderForecast(dailyData, hourlyData) {
  forecastGrid.innerHTML = '';

  // Compute week-wide temp range for sparklines
  const allHighs = dailyData.map(d => Math.round(d.temperatureHigh));
  const allLows  = dailyData.map(d => Math.round(d.temperatureLow));
  const weekMin  = Math.min(...allLows);
  const weekMax  = Math.max(...allHighs);
  const weekRange = weekMax - weekMin || 1;

  // Drawer element — shared, appended once
  const drawer = document.createElement('div');
  drawer.className = 'forecast-drawer-wrap';
  drawer.innerHTML = `<div class="forecast-drawer-inner">
    <div class="forecast-drawer-text">
      <div class="forecast-drawer-kicker" id="drawer-kicker"></div>
      <div class="forecast-drawer-summary" id="drawer-summary"></div>
    </div>
    <div class="forecast-drawer-matrix" id="drawer-matrix"></div>
  </div>`;

  let activeCol = null;

  dailyData.forEach((day, index) => {
    forecastGrid.appendChild(
      buildForecastCol(day, index, hourlyData, weekMin, weekRange, drawer, () => activeCol, (c) => { activeCol = c; })
    );
  });

  forecastGrid.appendChild(drawer);
}


// ── TIME-AWARE DRAWER TEXT ────────────────────────────────────────────
function getDrawerContent(day, hourlyData, dateStr, isToday) {
  const high  = Math.round(day.temperatureHigh);
  const low   = Math.round(day.temperatureLow);
  const pop   = Math.round((day.precipProbability || 0) * 100);
  const wind  = Math.round(day.windSpeed || 0);
  const windD = getWindDirection(day.windBearing || 0);
  const gust  = Math.round(day.windGust || wind);
  const humid = Math.round((day.humidity || 0) * 100);
  const uv    = Math.round(day.uvIndex || 0);

  // ── TODAY TEMPLATE: time-aware ────────────────────────────────────
  if (isToday) {
    const tod = getTimeOfDay(getIowaHour());
    const periods = {
      morning: { label: 'This Morning',   hour: 8  },
      day:     { label: 'This Afternoon', hour: 13 },
      evening: { label: 'This Evening',   hour: 18 },
      night:   { label: 'Tonight',        hour: 22 },
    };
    const { label, hour: targetHour } = periods[tod];
    const entry = getHourlyCondition(hourlyData, dateStr, targetHour);
    const isNightPeriod = tod === 'night' || tod === 'evening';
    const icon = entry ? entry.icon : (isNightPeriod
      ? day.icon.replace('clear-day','clear-night').replace('partly-cloudy-day','partly-cloudy-night')
      : day.icon);
    const desc = shortenSummary(day.summary, icon, icon);
    const condLower = desc.toLowerCase();

    let summary = '';
    if (isNightPeriod) {
      if (icon.includes('thunder'))                        summary = `${label} could bring thunderstorm activity`;
      else if (icon.includes('snow'))                      summary = `${label}, snow is possible overnight`;
      else if (icon.includes('rain')||icon.includes('drizzle')) summary = `${label} will be wet with ${condLower} moving through`;
      else if (icon.includes('clear'))                     summary = `Expect clear, crisp skies heading into the overnight hours`;
      else if (icon.includes('cloudy'))                    summary = `${label} will stay ${condLower} with clouds hanging around`;
      else                                                 summary = `${label}, conditions look ${condLower}`;

      if (low <= 32)      summary += `. Temperatures will drop to a frigid ${low}° overnight`;
      else if (low <= 45) summary += `. Temperatures will cool into the ${low}s overnight`;
      else                summary += `. Temperatures will settle comfortably around ${low}° overnight`;

      if (pop >= 70)      summary += `. Rain is likely through the night at ${pop}%`;
      else if (pop >= 30) summary += ` with a ${pop}% chance of overnight precipitation`;

      if (wind >= 25) { summary += `. Breezy overnight — winds ${wind} mph ${windD}`; if (gust > wind+5) summary += `, gusting to ${gust} mph`; }
      else if (wind <= 5) summary += `. Calm winds overnight`;
    } else {
      if (icon.includes('thunder'))                        summary = `${label} brings a risk of thunderstorms`;
      else if (icon.includes('snow'))                      summary = `${label}, expect snow conditions`;
      else if (icon.includes('rain')||icon.includes('drizzle')) summary = `${label} looks wet with ${condLower}`;
      else if (icon.includes('clear'))                     summary = `${label} is shaping up to be a beautiful clear day`;
      else if (icon.includes('cloudy'))                    summary = `${label} will be mostly ${condLower}`;
      else                                                 summary = `${label}, expect ${condLower}`;

      if (high >= 90)      summary += `. Hot out there — high of ${high}°, stay hydrated`;
      else if (high >= 80) summary += `. A warm high of ${high}°, low tonight around ${low}°`;
      else if (high <= 32) summary += `. Frigid — high of only ${high}°, bundle up`;
      else if (high <= 50) summary += `. A cool day with a high of ${high}° and a low of ${low}°`;
      else                 summary += `. High of ${high}°, low of ${low}°`;

      if (pop >= 70)      summary += `. Rain is likely at ${pop}%`;
      else if (pop >= 30) summary += ` with a ${pop}% chance of precipitation`;

      if (wind >= 30)      { summary += `. Very windy — sustained ${wind} mph ${windD}`; if (gust > wind+5) summary += `, gusting to ${gust} mph`; }
      else if (wind >= 15) summary += `. Winds ${wind} mph out of the ${windD}`;
      else if (wind <= 5)  summary += `. Calm winds will keep things pleasant`;

      if (uv >= 8)        summary += `. UV index is high at ${uv} — sunscreen recommended`;
      else if (uv >= 6)   summary += `. Moderate UV index of ${uv}`;

      if (humid >= 80 && high >= 75) summary += `. Feels muggy with ${humid}% humidity`;
    }
    summary += '.';

    // 4-col matrix for today
    const slots = [
      { label: 'Morning',   h: 8  },
      { label: 'Afternoon', h: 13 },
      { label: 'Evening',   h: 18 },
      { label: 'Night',     h: 22 },
    ];
    const hasHourly = slots.some(s => getHourlyCondition(hourlyData, dateStr, s.h) !== null);
    const matrixHTML = hasHourly ? slots.map(slot => {
      const e   = getHourlyCondition(hourlyData, dateStr, slot.h);
      const ico = e ? e.icon : day.icon;
      const tmp = e ? Math.round(e.temperature) : '--';
      return `<div class="forecast-matrix-col">
        <div class="forecast-matrix-label">${slot.label}</div>
        <img class="forecast-matrix-icon" src="${getIconPath(ico)}" alt="${ico}">
        <div class="forecast-matrix-temp">${tmp}°</div>
      </div>`;
    }).join('') : '';

    return { kicker: label, summary, matrixHTML };
  }

  // ── FUTURE DAY TEMPLATE: daily digest ────────────────────────────
  const rawDate  = new Date(day.time * 1000);
  const dateObj  = new Date(rawDate.toLocaleDateString('en-US'));
  const dayName  = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  const dayIcon     = (() => { const e = getHourlyCondition(hourlyData, dateStr, 13); return e ? e.icon : day.icon; })();
  const nightIcon   = (() => { const e = getHourlyCondition(hourlyData, dateStr, 21); return e ? e.icon : day.icon.replace('clear-day','clear-night').replace('partly-cloudy-day','partly-cloudy-night'); })();
  const dayDesc     = shortenSummary(day.summary, dayIcon, nightIcon);
  const nightDesc   = shortenSummary(null, nightIcon, nightIcon);
  const dayEntry    = getHourlyCondition(hourlyData, dateStr, 13);
  const nightEntry  = getHourlyCondition(hourlyData, dateStr, 21);
  const dayTemp     = dayEntry   ? Math.round(dayEntry.temperature)   : high;
  const nightTemp   = nightEntry ? Math.round(nightEntry.temperature) : low;

  // Heading into the evening note — kept brief since DAY/NIGHT icons show explicit conditions
  const overallStable = !dayIcon.includes('thunder') && !dayIcon.includes('rain') && !dayIcon.includes('snow');
  const isWarm  = high >= 80;
  const isCool  = high <= 55;
  const isWindy = wind >= 20;

  let summary = '';

  // Narrative context — atmospheric, not redundant with the icons
  if (dayIcon.includes('thunder')) {
    summary = `An unsettled pattern sets up for ${dayName}. Monitor conditions closely as storms could affect travel and outdoor plans`;
  } else if (dayIcon.includes('rain') || dayIcon.includes('drizzle')) {
    summary = `A low pressure system keeps ${dayName} unsettled. Plan for wet conditions and reduced visibility at times`;
  } else if (dayIcon.includes('snow')) {
    summary = `Winter conditions arrive for ${dayName}. Allow extra travel time and monitor road conditions throughout the day`;
  } else if (overallStable && isWarm) {
    summary = `High pressure brings pleasant, settled weather to the region for ${dayName}. Conditions look favorable for travel and outdoor plans`;
  } else if (overallStable && isCool) {
    summary = `A cool but quiet day for ${dayName}. High pressure keeps conditions stable with no significant weather expected`;
  } else if (overallStable) {
    summary = `Quiet weather holds for ${dayName} with no significant systems in the area. A routine day across the region`;
  } else {
    summary = `Mixed conditions expected for ${dayName}. Check back for updates as conditions evolve`;
  }

  if (isWindy) summary += `. Winds will be a factor at ${wind} mph ${windD}`;
  if (pop >= 50) summary += `. Precipitation chances are elevated at ${pop}%`;
  summary += '.';

  // DAY / NIGHT binary matrix
  const matrixHTML = `
    <div class="forecast-matrix-col forecast-matrix-col--lg">
      <div class="forecast-matrix-label">Day</div>
      <img class="forecast-matrix-icon forecast-matrix-icon--lg" src="${getIconPath(dayIcon)}" alt="${dayIcon}">
      <div class="forecast-matrix-temp forecast-matrix-temp--high">${dayTemp}°</div>
      <div class="forecast-matrix-desc">${dayDesc}</div>
    </div>
    <div class="forecast-matrix-col forecast-matrix-col--lg">
      <div class="forecast-matrix-label">Night</div>
      <img class="forecast-matrix-icon forecast-matrix-icon--lg" src="${getIconPath(nightIcon)}" alt="${nightIcon}">
      <div class="forecast-matrix-temp">${nightTemp}°</div>
      <div class="forecast-matrix-desc">${nightDesc}</div>
    </div>`;

  const kicker   = `${dayName} Outlook`;

  return { kicker, summary, matrixHTML };
}


// ── BUILD FORECAST COLUMN ─────────────────────────────────────────────
function buildForecastCol(day, index, hourlyData, weekMin, weekRange, drawer, getActive, setActive) {
  const raw      = new Date(day.time * 1000);
  const date     = new Date(raw.toLocaleDateString('en-US'));
  const dateStr  = raw.toISOString().split('T')[0];
  const today    = new Date();
  const isToday  = date.toDateString() === today.toDateString();
  const dayLabel = formatDayLabel(date);
  const dateLbl  = formatDateLabel(date);
  const high     = Math.round(day.temperatureHigh);
  const low      = Math.round(day.temperatureLow);
  const pop      = Math.round((day.precipProbability || 0) * 100);
  const holiday  = getHoliday(date);

  const middayEntry  = getHourlyCondition(hourlyData, dateStr, 12);
  const eveningEntry = getHourlyCondition(hourlyData, dateStr, 20);
  const middayIcon   = middayEntry  ? middayEntry.icon  : day.icon;
  const eveningIcon  = eveningEntry ? eveningEntry.icon : day.icon;
  const middayPath   = getIconPath(middayIcon);
  const desc         = shortenSummary(day.summary, middayIcon, eveningIcon);

  // Sparkline position
  const sparkLeft  = ((low  - weekMin) / weekRange * 100).toFixed(1);
  const sparkWidth = ((high - low)     / weekRange * 100).toFixed(1);

  // Condition glow color
  const glowMap = {
    'thunderstorm':        'rgba(139,92,246,0.5)',
    'rain':                'rgba(59,130,246,0.4)',
    'drizzle':             'rgba(96,165,250,0.3)',
    'sleet':               'rgba(148,163,184,0.3)',
    'snow':                'rgba(186,230,253,0.35)',
    'clear-day':           'rgba(251,191,36,0.35)',
    'partly-cloudy-day':   'rgba(251,191,36,0.2)',
    'clear-night':         'rgba(99,102,241,0.3)',
    'partly-cloudy-night': 'rgba(99,102,241,0.2)',
    'wind':                'rgba(148,163,184,0.25)',
    'fog':                 'rgba(148,163,184,0.2)',
  };
  const glow = glowMap[middayIcon] || 'rgba(255,255,255,0.08)';

  const precipType = day.precipType || '';
  const isSnow = precipType === 'snow' || precipType === 'sleet';

  const col = document.createElement('div');
  col.className = 'forecast-col';
  col.style.animationDelay = `${index * 60}ms`;
  col.style.setProperty('--col-glow', glow);
  col.style.setProperty('--spark-left',  `${sparkLeft}%`);
  col.style.setProperty('--spark-width', `${sparkWidth}%`);

  col.innerHTML = `
    ${holiday ? `<div class="holiday-badge">${holiday.name}</div>` : ''}
    <div class="forecast-day">${dayLabel}</div>
    <div class="forecast-date">${dateLbl}</div>
    <img class="forecast-icon" src="${middayPath}" alt="${desc}" loading="lazy">
    <div class="forecast-description">${desc}</div>
    <div class="forecast-sparkline"><div class="forecast-sparkline-fill"></div></div>
    <div class="forecast-temps">
      <span class="forecast-low">${low}°</span>
      <span class="forecast-high">${high}°</span>
    </div>
    ${pop > 0 ? `<div class="forecast-precip">${isSnow ? '❄️' : '💧'} ${pop}%</div>` : '<div class="forecast-precip"></div>'}
  `;

  col.addEventListener('click', () => {
    const isAlreadyActive = col.classList.contains('fc-active');

    // Deactivate previous
    const prev = getActive();
    if (prev) prev.classList.remove('fc-active');

    if (isAlreadyActive) {
      // Toggle off
      setActive(null);
      drawer.classList.remove('open');
    } else {
      col.classList.add('fc-active');
      setActive(col);

      // Populate drawer
      const { kicker, summary, matrixHTML } = getDrawerContent(day, hourlyData, dateStr, isToday);
      document.getElementById('drawer-kicker').textContent  = kicker;
      document.getElementById('drawer-summary').textContent = summary;
      const matrixEl = document.getElementById('drawer-matrix');
      matrixEl.innerHTML = matrixHTML;
      matrixEl.style.display = matrixHTML ? 'grid' : 'none';
      drawer.classList.add('open');
    }
  });

  return col;
}


// ── SHORTEN WEATHER SUMMARY ──────────────────────────────────────────
// Converts verbose API summaries to simple, clear weather terms
function shortenSummary(summary, dayIcon, nightIcon) {
  if (!summary) return getShortCondition(dayIcon);
  
  const s = summary.toLowerCase();
  
  // Extract the simplest possible weather term
  // Priority order matters - check specific conditions first
  
  if (s.includes('thunderstorm') || s.includes('thunder')) return 'Thunderstorms';
  if (s.includes('heavy rain')) return 'Heavy Rain';
  if (s.includes('light rain')) return 'Light Rain';
  if (s.includes('freezing rain')) return 'Freezing Rain';
  if (s.includes('rain') && s.includes('snow')) return 'Rain & Snow';
  if (s.includes('rain')) return 'Rain';
  if (s.includes('drizzle')) return 'Drizzle';
  if (s.includes('heavy snow')) return 'Heavy Snow';
  if (s.includes('light snow')) return 'Light Snow';
  if (s.includes('snow')) return 'Snow';
  if (s.includes('sleet')) return 'Sleet';
  if (s.includes('hail')) return 'Hail';
  if (s.includes('ice')) return 'Ice';
  if (s.includes('fog')) return 'Foggy';
  if (s.includes('mist')) return 'Misty';
  if (s.includes('haze') || s.includes('hazy')) return 'Hazy';
  if (s.includes('overcast')) return 'Overcast';
  if (s.includes('mostly cloudy')) return 'Mostly Cloudy';
  if (s.includes('partly cloudy')) return 'Partly Cloudy';
  if (s.includes('cloudy')) return 'Cloudy';
  if (s.includes('windy') || s.includes('wind')) return 'Windy';
  if (s.includes('breezy')) return 'Breezy';
  if (s.includes('clear')) return 'Clear';
  if (s.includes('sunny')) return 'Sunny';
  
  // Fallback: use day icon description
  return getShortCondition(dayIcon);
}

// Get short condition label from icon code
function getShortCondition(icon) {
  const map = {
    'clear-day':           'Sunny',
    'clear-night':         'Clear',
    'partly-cloudy-day':   'Partly Cloudy',
    'partly-cloudy-night': 'Partly Cloudy',
    'cloudy':              'Cloudy',
    'rain':                'Rain',
    'sleet':               'Sleet',
    'snow':                'Snow',
    'wind':                'Windy',
    'fog':                 'Foggy',
    'thunderstorm':        'Thunderstorms',
  };
  return map[icon] || 'Mixed';
}


// ── HOURLY CONDITION HELPER ───────────────────────────────────────────
function getHourlyCondition(hourlyData, dateStr, targetHour) {
  const dayEntries = hourlyData.filter(h => {
    const d = new Date(h.time * 1000);
    return d.toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' }) ===
           new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' });
  });
  if (!dayEntries.length) return null;
  return dayEntries.reduce((closest, entry) => {
    const eH = new Date(entry.time * 1000).getHours();
    const cH = new Date(closest.time * 1000).getHours();
    return Math.abs(eH - targetHour) < Math.abs(cH - targetHour) ? entry : closest;
  });
}


// ── BUILD FORECAST CARD ───────────────────────────────────────────────
// Wind direction helper
function getWindDirection(degrees) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(degrees / 45) % 8;
  return dirs[idx];
}


// ── HOURLY CHART ──────────────────────────────────────────────────────
// 24-hour windows. Max 2 arrow clicks (Today / Tomorrow / Day after).
// Pirate Weather reliably provides ~48hrs of hourly data so this
// matches what's actually available without hitting empty windows.
// Gradient: blue (cold) → amber (warm) via requestAnimationFrame.
// Midnight crossings show a dashed divider + day label.
function renderHourlyChart(hourlyData, offset = 0) {
  storedHourly = hourlyData;

  const now   = new Date();

  // Window starts at current hour + offset * 12 hours
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + offset * 12);
  const end = new Date(start);
  end.setHours(end.getHours() + 12);

  const navLabel = document.getElementById('hourly-nav-label');
  const prevBtn  = document.getElementById('hourly-prev');
  const nextBtn  = document.getElementById('hourly-next');

  // Format time window label e.g. "TODAY · 2PM – 2AM"
  const fmtHour = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '').toLowerCase().replace(':00', '');
  const startLbl = fmtHour(start);
  // End label = last actual hour shown (start + 11hrs)
  const lastHour = new Date(start);
  lastHour.setHours(lastHour.getHours() + 11);
  const endLbl   = fmtHour(lastHour);

  const isToday    = start.toDateString() === now.toDateString();
  const isTomorrow = (() => {
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    return start.toDateString() === tom.toDateString();
  })();

  const dayName  = start.toLocaleDateString('en-US', { weekday: 'long' });
  navLabel.textContent = `${dayName} · ${startLbl} – ${endLbl}`;

  prevBtn.disabled = offset === 0;
  nextBtn.disabled = offset >= 3; // 4 pages: now, +12, +24, +36

  const hours = hourlyData.filter(h => {
    const t = new Date(h.time * 1000);
    return t >= start && t < end;
  });
  if (!hours.length) return;

  const nowHour   = now.getHours();
  const labels    = hours.map(h => formatHourLabel(new Date(h.time * 1000)));
  const temps     = hours.map(h => Math.round(h.temperature));
  const feelsLike = hours.map(h => Math.round(h.apparentTemperature || h.temperature));
  const feelsDiffers = feelsLike.some((fl, i) => fl !== temps[i]);
  const feelsLegend = document.getElementById('hourly-feels-legend');
  if (feelsLegend) feelsLegend.hidden = !feelsDiffers;
  const pops      = hours.map(h => Math.round((h.precipProbability || 0) * 100));
  const types     = hours.map(h => h.precipType || 'rain');
  const summaries = hours.map(h => h.summary || '');
  const icons     = hours.map(h => h.icon || '');

  const currentIdx = offset === 0 ? 0 : -1;

  // ── Build card strip ────────────────────────────────────────────
  const strip = document.getElementById('hourly-card-strip');
  if (strip) {
    strip.innerHTML = '';
    hours.forEach((h, i) => {
      const hDate  = new Date(h.time * 1000);
      const isNow  = i === currentIdx;
      const timeStr = isNow ? 'Now' : fmtHour(hDate);
      const pop    = pops[i];
      const icon   = icons[i] || 'partly-cloudy-day';
      const iconPath = getIconPath(icon);

      const card = document.createElement('div');
      card.className = 'hourly-card' + (isNow ? ' is-now' : '');
      card.innerHTML = `
        <div class="hourly-card-time">${timeStr}</div>
        <img class="hourly-card-icon" src="${iconPath}" alt="${icon}" loading="lazy">
        <div class="hourly-card-temp">${temps[i]}°</div>
        <div class="hourly-card-pop">${pop > 5 ? (types[i] === 'snow' ? '❄ ' : '💧 ') + pop + '%' : ''}</div>
      `;
      strip.appendChild(card);
    });
  }

  const findPeriodTemp = (targetHour) => {
    const entry = hours.find(h => new Date(h.time * 1000).getHours() >= targetHour);
    return entry ? Math.round(entry.temperature) + '°F' : '--';
  };
  if (periodMorn)  periodMorn.textContent  = findPeriodTemp(6);
  if (periodAftn)  periodAftn.textContent  = findPeriodTemp(12);
  if (periodEve)   periodEve.textContent   = findPeriodTemp(18);
  if (periodNight) periodNight.textContent = findPeriodTemp(21);

  if (hourlyChart) { hourlyChart.destroy(); hourlyChart = null; }

  const canvas = document.getElementById('hourly-chart');
  const ctx    = canvas.getContext('2d');

  const minT   = Math.min(...temps);
  const maxT   = Math.max(...temps);
  const range  = maxT - minT || 1;
  const isWarm = maxT >= 75;
  const isCold = maxT <= 45;

  function createLineGradient(chart) {
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return '#93c5fd';
    const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    // Use absolute scale: 32°F = cold blue, 95°F = warm orange
    const absMin = 32, absMax = 95, absRange = absMax - absMin;
    hours.forEach((h, i) => {
      const ratio = Math.max(0, Math.min(1, (Math.round(h.temperature) - absMin) / absRange));
      const pos   = Math.min(i / (hours.length - 1 || 1), 1);
      // cold: #93c5fd (147,197,253) → warm: #f97316 (249,115,22)
      const r  = Math.round(147 + (249 - 147) * ratio);
      const gv = Math.round(197 + (115 - 197) * ratio);
      const b  = Math.round(253 + (22  - 253) * ratio);
      g.addColorStop(pos, `rgb(${r},${gv},${b})`);
    });
    return g;
  }

  function createAreaGradient(chart) {
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return 'transparent';
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    if (isWarm) {
      g.addColorStop(0,   'rgba(249,115,22,0.18)');
      g.addColorStop(0.6, 'rgba(249,115,22,0.04)');
      g.addColorStop(1,   'rgba(249,115,22,0)');
    } else if (isCold) {
      g.addColorStop(0,   'rgba(147,197,253,0.2)');
      g.addColorStop(0.6, 'rgba(147,197,253,0.05)');
      g.addColorStop(1,   'rgba(147,197,253,0)');
    } else {
      g.addColorStop(0,   'rgba(167,210,255,0.16)');
      g.addColorStop(0.6, 'rgba(147,197,253,0.04)');
      g.addColorStop(1,   'rgba(147,197,253,0)');
    }
    return g;
  }

  // Precip bar plugin — full height columns, opacity = precip intensity
  hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        // ── Precip bars — secondary Y axis, drawn first (behind temp line)
        {
          label:              'Precip',
          data:               pops,
          type:               'bar',
          yAxisID:            'yPrecip',
          order:              2,
          backgroundColor:    pops.map((p, i) => {
            const isSnow = types[i] === 'snow';
            return isSnow
              ? `rgba(186,230,253,${0.05 + (p / 100) * 0.12})`
              : `rgba(56,189,248,${0.05 + (p / 100) * 0.12})`;
          }),
          borderColor:        pops.map((p, i) => {
            const isSnow = types[i] === 'snow';
            return isSnow
              ? `rgba(186,230,253,${0.08 + (p / 100) * 0.15})`
              : `rgba(56,189,248,${0.08 + (p / 100) * 0.15})`;
          }),
          borderWidth:        1,
          borderRadius:       { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
          borderRadius:       { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
          barPercentage:      0.7,
          categoryPercentage: 1.0,
        },
        // ── Actual temp line — primary Y axis, drawn on top
        {
          label:            'Actual',
          data:             temps,
          type:             'line',
          yAxisID:          'y',
          order:            0,
          tension:          0.4,
          borderWidth:      2.5,
          borderColor:      '#93c5fd',
          pointRadius:      (ctx) => ctx.dataIndex === currentIdx ? 8 : 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor:      (ctx) => ctx.dataIndex === currentIdx ? '#fbbf24' : 'rgba(255,255,255,0.3)',
          pointHoverBackgroundColor: '#ffffff',
          pointBorderColor:          (ctx) => ctx.dataIndex === currentIdx ? '#ffffff' : 'rgba(255,255,255,0.12)',
          pointHoverBorderColor:     '#fbbf24',
          pointBorderWidth:          2,
          fill:             true,
          backgroundColor:  'transparent',
        },
        // ── Feels Like dashed overlay
        {
          label:            'Feels Like',
          data:             feelsLike,
          type:             'line',
          yAxisID:          'y',
          order:            1,
          tension:          0.4,
          borderWidth:      1.5,
          borderColor:      'rgba(251,191,36,0.4)',
          borderDash:       [5, 4],
          pointRadius:      0,
          pointHoverRadius: 4,
          pointBackgroundColor: '#fbbf24',
          fill:             false,
        },
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 250 },
      interaction:         { mode: 'index', intersect: false },
      layout:              { padding: { top: 24, bottom: 4 } },
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: false },
      },
      onHover: (_evt, elements) => {
        const cards = document.querySelectorAll('.hourly-card');
        cards.forEach(c => c.classList.remove('is-highlighted'));
        if (elements.length) {
          const idx = elements[0].index;
          if (cards[idx]) cards[idx].classList.add('is-highlighted');
        }
      },
      scales: {
        x: {
          display: false,
          grid:    { display: false },
        },
        y: {
          position: 'left',
          grid:     { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color:         'rgba(255,255,255,0.25)',
            font:          { size: 10 },
            callback:      (val) => `${val}°`,
            maxTicksLimit: 4,
          },
          grace: '25%',
        },
        yPrecip: {
          position: 'right',
          min:      0,
          max:      100,
          display:  false,
          grid:     { display: false },
        },
      }
    },
  });

  // Apply gradients after chartArea is ready
  requestAnimationFrame(() => {
    if (!hourlyChart) return;
    // Dataset 0 = precip bars, dataset 1 = temp line
    hourlyChart.data.datasets[1].borderColor     = createLineGradient(hourlyChart);
    hourlyChart.data.datasets[1].backgroundColor = createAreaGradient(hourlyChart);
    hourlyChart.update('none');
  });
}


// ── SPC OUTLOOK ───────────────────────────────────────────────────────
function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkFeature(lat, lon, feature) {
  const geom = feature.geometry;
  if (geom.type === 'Polygon')      return pointInPolygon(lat, lon, geom.coordinates[0]);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some(p => pointInPolygon(lat, lon, p[0]));
  return false;
}

async function fetchSPCOutlook(lat, lon) {
  try {
    const res = await fetch('https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson');
    if (!res.ok) throw new Error();
    const data = await res.json();

    let detectedRisk = null;
    for (const code of ['HIGH', 'MDT', 'ENH', 'SLGT', 'MRGL', 'TSTM']) {
      const features = data.features.filter(f =>
        f.properties.LABEL === code || f.properties.LABEL2 === code
      );
      if (features.some(f => checkFeature(lat, lon, f))) { detectedRisk = code; break; }
    }

    if (detectedRisk && ACTIVE_RISKS.has(detectedRisk)) {
      const risk = SPC_RISKS[detectedRisk];
      spcBadge.style.background  = risk.color;
      spcBadge.style.color       = risk.text;
      spcRiskLabel.textContent   = risk.label;
      spcDescription.textContent = SPC_DESCRIPTIONS[detectedRisk];
      spcPanel.hidden = false;
    } else {
      spcPanel.hidden = true;
    }
  } catch {
    spcPanel.hidden = true;
  }
}

const MRMS_PROXY_URL = 'https://mrms-proxy.derekdhoang.workers.dev';

function initRadarPreview() {
  if (previewMap) {
    refreshRadarPreview();
    loadDrawingsOntoPreview();
    return;
  }

  previewMap = L.map('radar-preview-map', {
    center:          [41.878, -93.097],
    zoom:            8,
    minZoom:         6,
    maxZoom:         8,
    zoomControl:     true,
    scrollWheelZoom: true,
    dragging:        true,
    doubleClickZoom: true,
    keyboard:        false,
    maxBounds:       [[24.0, -130.0], [50.0, -60.0]],
    maxBoundsViscosity: 1.0,
  });

  // Base map — always dark
  document.getElementById('radar-preview-map').style.background = '#0a1628';
  const spcMap = document.getElementById('spc-outlook-map');
  if (spcMap) spcMap.style.background = '#0a1628';

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19, opacity: 1, zIndex: 1
  }).addTo(previewMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '', maxZoom: 19, opacity: 1, zIndex: 450
  }).addTo(previewMap);

  loadPreviewStateBoundaries();
  refreshRadarPreview();
  loadDrawingsOntoPreview();
  initRadarControls();
}

async function loadPreviewStateBoundaries() {
  try {
    const res  = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
    const data = await res.json();
    L.geoJSON(data, {
      style: (feature) => {
        const name = feature.properties.name || feature.properties.NAME || '';
        const fips = String(feature.id || feature.properties.STATE || feature.properties.STATEFP || '');
        if (name === IOWA_NAME || fips === IOWA_FIPS_CODE) {
          return { color: '#60a5fa', weight: 2.5, fillOpacity: 0, interactive: false };
        }
        return { opacity: 0, fillOpacity: 0, interactive: false };
      }
    }).addTo(previewMap);
  } catch (err) {
    console.error('State boundaries failed:', err);
  }
}

async function refreshRadarPreview() {
  if (!previewMap) return;
  if (previewRadar) { previewMap.removeLayer(previewRadar); previewRadar = null; }

  try {
    const res = await fetch(`${MRMS_PROXY_URL}/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { latest, lag_minutes } = await res.json();

    previewRadar = L.tileLayer(
      `${MRMS_PROXY_URL}/tiles/${latest}/{z}/{x}/{y}.png`,
      { opacity: 0.55, attribution: 'MRMS · NOAA', zIndex: 200 }
    ).addTo(previewMap);

    const lagText = lag_minutes < 10
      ? `${Math.round(lag_minutes)}m ago`
      : `⚠️ ${Math.round(lag_minutes)}m ago`;
    radarPanelTimestamp.textContent = `MRMS · ${lagText}`;
  } catch (err) {
    console.error('MRMS preview failed:', err);
    radarPanelTimestamp.textContent = 'Radar unavailable';
  }
}

// ── RADAR ANIMATION ───────────────────────────────────────────────────
let radarFrames    = [];
let radarFrameIdx  = 0;
let radarPlaying   = false;
let radarPlayTimer = null;

async function loadRadarFrames() {
  try {
    const res  = await fetch(`${MRMS_PROXY_URL}/latest`);
    if (!res.ok) return;
    const data = await res.json();
    radarFrames   = data.frames || [];
    radarFrameIdx = radarFrames.length - 1;
    updateRadarControls();
    // Show the latest frame immediately
    showRadarFrame(radarFrameIdx);
  } catch (err) {
    console.warn('Could not load radar frames:', err);
  }
}

function updateRadarControls() {
  const fill      = document.getElementById('radar-timeline-fill');
  const thumb     = document.getElementById('radar-timeline-thumb');
  const timestamp = document.getElementById('radar-timestamp-pill');
  if (!radarFrames.length) return;

  const pct = (radarFrameIdx / (radarFrames.length - 1)) * 100;
  if (fill)  fill.style.width = pct + '%';
  if (thumb) thumb.style.left = pct + '%';

  if (timestamp) {
    const frame = radarFrames[radarFrameIdx];
    if (frame) {
      // Parse timestamp format: 20260517-015440 → date object
      const y  = frame.slice(0, 4);
      const mo = frame.slice(4, 6);
      const d  = frame.slice(6, 8);
      const h  = frame.slice(9, 11);
      const mi = frame.slice(11, 13);
      const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`);
      timestamp.textContent = dt.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
        timeZone: 'America/Chicago'
      });
    }
  }
}

function showRadarFrame(idx) {
  if (!previewMap || !radarFrames.length) return;
  if (previewRadar) { previewMap.removeLayer(previewRadar); previewRadar = null; }

  const frame = radarFrames[idx];
  if (!frame) return;

  previewRadar = L.tileLayer(
    `${MRMS_PROXY_URL}/tiles/${frame}/{z}/{x}/{y}.png`,
    { opacity: 0.55, attribution: 'MRMS · NOAA', zIndex: 200 }
  ).addTo(previewMap);

  radarFrameIdx = idx;
  updateRadarControls();
}

function radarPlay() {
  if (radarPlaying) return;
  radarPlaying = true;

  const playBtn   = document.getElementById('radar-play-btn');
  const playIcon  = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  if (playBtn)   playBtn.classList.add('playing');
  if (playIcon)  playIcon.style.display  = 'none';
  if (pauseIcon) pauseIcon.style.display = '';

  radarPlayTimer = setInterval(() => {
    let next = radarFrameIdx + 1;
    if (next >= radarFrames.length) next = 0;
    showRadarFrame(next);
  }, 600);
}

function radarPause() {
  radarPlaying = false;
  clearInterval(radarPlayTimer);
  radarPlayTimer = null;

  const playBtn   = document.getElementById('radar-play-btn');
  const playIcon  = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  if (playBtn)   playBtn.classList.remove('playing');
  if (playIcon)  playIcon.style.display  = '';
  if (pauseIcon) pauseIcon.style.display = 'none';
}

function initRadarControls() {
  const playBtn  = document.getElementById('radar-play-btn');
  const timeline = document.getElementById('radar-timeline-wrap');

  const pill = document.getElementById('radar-control-pill');
  if (pill && previewMap) {
    pill.addEventListener('mouseenter', () => {
      previewMap.dragging.disable();
      previewMap.scrollWheelZoom.disable();
    });
    pill.addEventListener('mouseleave', () => {
      previewMap.dragging.enable();
      previewMap.scrollWheelZoom.enable();
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      radarPlaying ? radarPause() : radarPlay();
    });
  }

  if (timeline) {
    timeline.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!radarFrames.length) return;
      const rect = timeline.getBoundingClientRect();
      const pct  = (e.clientX - rect.left) / rect.width;
      const idx  = Math.round(pct * (radarFrames.length - 1));
      radarPause();
      showRadarFrame(Math.max(0, Math.min(idx, radarFrames.length - 1)));
    });

    // Also block mousedown from reaching Leaflet
    timeline.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  }

  loadRadarFrames();
  initWindLayer();
}


setInterval(refreshRadarPreview, 2 * 60 * 1000);

// ── WIND PARTICLES ────────────────────────────────────────────────────
async function initWindLayer() {
  if (!previewMap) return;
  try {
    const res = await fetch(WIND_URL);
    if (!res.ok) throw new Error(`Wind fetch failed: ${res.status}`);
    const data = await res.json();

    windLayer = L.velocityLayer({
      displayValues:      false,
      data:               data,
      maxVelocity:        20,
      colorScale:         ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.95)'],
      velocityScale:      0.005,
      particleAge:        64,
      lineWidth:          1.2,
      particleMultiplier: 0.0015,
      frameRate:          16,
    });

    if (windEnabled) windLayer.addTo(previewMap);
    windInitialized = true;

    // Restore city view if one was already set (prevents leaflet-velocity from shifting view)
    if (lastCityView) {
      setTimeout(() => {
        previewMap.setView([lastCityView.lat, lastCityView.lon], lastCityView.zoom);
      }, 150);
    }

    console.log('✓ Wind layer loaded');
  } catch (err) {
    console.warn('Wind layer unavailable:', err.message);
  }
}

function toggleWind() {
  if (!previewMap) return;
  windEnabled = !windEnabled;

  const btn = document.getElementById('wind-toggle-btn');

  if (windEnabled) {
    if (windLayer) windLayer.addTo(previewMap);
    if (btn) btn.classList.remove('wind-off');
  } else {
    if (windLayer) previewMap.removeLayer(windLayer);
    if (btn) btn.classList.add('wind-off');
  }
}

function updatePreviewCityMarker(cityName, lat, lon) {
  if (!previewMap) return;
  if (previewCityMarker) { previewMap.removeLayer(previewCityMarker); previewCityMarker = null; }

  const inUS = lat >= 24.0 && lat <= 49.5 && lon >= -125.0 && lon <= -66.0;
  if (!inUS) return;

  const coverage  = ['iowa city', 'cedar rapids', 'west liberty', 'muscatine', 'davenport'];
  const zoomLevel = coverage.includes(cityName.toLowerCase()) ? 11 : 10;

  previewCityMarker = L.circleMarker([lat, lon], {
    radius: 8, fillColor: '#fbbf24', color: '#ffffff',
    weight: 2.5, opacity: 1, fillOpacity: 0.9, zIndex: 500,
  }).addTo(previewMap);

  lastCityView = { lat, lon, zoom: zoomLevel };
  previewMap.setView([lat, lon], zoomLevel);
}

function loadDrawingsOntoPreview() {
  if (!previewMap) return;
  if (previewDrawings) { previewMap.removeLayer(previewDrawings); previewDrawings = null; }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    previewDrawings = L.geoJSON(JSON.parse(saved), {
      style: (f) => ({
        color:       f.properties.color || '#4daf4d',
        fillColor:   f.properties.color || '#4daf4d',
        fillOpacity: 0.25,
        weight:      2,
        interactive: false,
      }),
    }).addTo(previewMap);
  } catch (err) { console.error('Drawing load failed:', err); }
}


// ── EVENT LISTENERS ───────────────────────────────────────────────────
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (!city) return;
  hideSuggestions();
  fetchWeather(null, null, city);
});

cityInput.addEventListener('input', () => {
  const q = cityInput.value.trim();
  if (q.length >= 2)   debounce(() => fetchSuggestions(q), 300);
  else if (q.length === 0) hideSuggestions();
});

cityInput.addEventListener('focus', () => {
  if (cityInput.value.trim() === '') showRecentSearches();
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
      cityInput.value = '';
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

document.getElementById('hourly-prev').addEventListener('click', () => {
  if (hourlyOffset > 0) { hourlyOffset--; renderHourlyChart(storedHourly, hourlyOffset); }
});

document.getElementById('hourly-next').addEventListener('click', () => {
  if (hourlyOffset < 3) { hourlyOffset++; renderHourlyChart(storedHourly, hourlyOffset); }
});


// ── RADAR / SPC TABS ──────────────────────────────────────────────────
let spcOutlookMap   = null;
let spcOutlookLayer = null;
let spcCurrentDay   = 1;

const SPC_MAP_URLS = {
  1: 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson',
  2: 'https://www.spc.noaa.gov/products/outlook/day2otlk_cat.nolyr.geojson',
  3: 'https://www.spc.noaa.gov/products/outlook/day3otlk_cat.nolyr.geojson',
};

const SPC_FILL = {
  'TSTM': 'rgba(197,232,197,0.45)', 'MRGL': 'rgba(77,175,77,0.5)',
  'SLGT': 'rgba(240,240,77,0.5)',   'ENH':  'rgba(232,160,50,0.55)',
  'MDT':  'rgba(232,64,64,0.55)',   'HIGH': 'rgba(255,64,255,0.6)',
};

const SPC_STROKE = {
  'TSTM': '#4daf4d', 'MRGL': '#2d8f2d', 'SLGT': '#c0c020',
  'ENH':  '#c06010', 'MDT':  '#b02020', 'HIGH': '#cc00cc',
};

const SPC_RISK_NAMES = {
  'TSTM': 'General Thunder', 'MRGL': 'Marginal Risk', 'SLGT': 'Slight Risk',
  'ENH':  'Enhanced Risk',   'MDT':  'Moderate Risk', 'HIGH': 'High Risk',
};

// Uniform attribution style applied to all maps
const ATTR_STYLE = 'font-size:0.55rem;background:rgba(10,22,40,0.75)!important;color:rgba(255,255,255,0.3)!important;border-radius:4px;padding:2px 6px;';

function applyUniformAttribution(leafletMap) {
  leafletMap.on('load', () => {});
  // Apply after a tick so the attribution control is in DOM
  setTimeout(() => {
    const el = leafletMap.getContainer().querySelector('.leaflet-control-attribution');
    if (el) el.setAttribute('style', ATTR_STYLE);
  }, 100);
}

function initRadarTabs() {
  const tabRadar    = document.getElementById('tab-radar');
  const tabSpc      = document.getElementById('tab-spc');
  const radarView   = document.getElementById('radar-view');
  const spcView     = document.getElementById('spc-view');
  const timestamp   = document.getElementById('radar-panel-timestamp');
  const spcDayTabs  = document.getElementById('spc-day-tabs');
  if (!tabRadar || !tabSpc) return;

  if (previewMap) applyUniformAttribution(previewMap);

  tabRadar.addEventListener('click', () => {
    tabRadar.classList.add('active');
    tabSpc.classList.remove('active');
    radarView.hidden = false;
    spcView.hidden   = true;
    if (timestamp)  timestamp.style.display  = '';
    if (spcDayTabs) spcDayTabs.style.display = 'none';
    if (previewMap) setTimeout(() => previewMap.invalidateSize(), 50);
  });

  tabSpc.addEventListener('click', () => {
    tabSpc.classList.add('active');
    tabRadar.classList.remove('active');
    spcView.hidden   = false;
    radarView.hidden = true;
    if (timestamp)  timestamp.style.display  = 'none';
    if (spcDayTabs) spcDayTabs.style.display = '';
    initSPCOutlookMap();
  });

  document.querySelectorAll('.spc-day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.spc-day-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      spcCurrentDay = parseInt(btn.dataset.day);
      loadSPCOutlookLayer(spcCurrentDay);
    });
  });
}

function initSPCOutlookMap() {
  if (spcOutlookMap) {
    setTimeout(() => spcOutlookMap.invalidateSize(), 50);
    loadSPCOutlookLayer(spcCurrentDay);
    return;
  }

  spcOutlookMap = L.map('spc-outlook-map', {
    center:          [38.5, -96.0],
    zoom:            5,
    minZoom:         5,
    maxZoom:         7,
    zoomControl:     false,
    scrollWheelZoom: false,
    dragging:        false,
    doubleClickZoom: false,
    keyboard:        false,
    attributionControl: true,
  });

  // SPC Base map — always dark
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19, opacity: 1
  }).addTo(spcOutlookMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '', maxZoom: 19, opacity: 1, zIndex: 450
  }).addTo(spcOutlookMap);

  applyUniformAttribution(spcOutlookMap);
  loadSPCOutlookLayer(spcCurrentDay);
}

async function loadSPCOutlookLayer(day) {
  if (!spcOutlookMap) return;
  if (spcOutlookLayer) { spcOutlookMap.removeLayer(spcOutlookLayer); spcOutlookLayer = null; }
  try {
    const res  = await fetch(SPC_MAP_URLS[day]);
    if (!res.ok) throw new Error('SPC unavailable');
    const data = await res.json();
    spcOutlookLayer = L.geoJSON(data, {
      style: (f) => {
        const code = f.properties.LABEL || f.properties.LABEL2 || '';
        return { fillColor: SPC_FILL[code] || 'rgba(255,255,255,0.1)', color: SPC_STROKE[code] || 'rgba(255,255,255,0.3)', weight: 1.5, fillOpacity: 1, opacity: 1 };
      },
      onEachFeature: (f, layer) => {
        const code = f.properties.LABEL || '';
        if (SPC_RISK_NAMES[code]) layer.bindTooltip(SPC_RISK_NAMES[code], { sticky: true });
      }
    }).addTo(spcOutlookMap);
  } catch (e) { console.error('SPC layer failed:', e); }
}


// ── INIT ──────────────────────────────────────────────────────────────
fetchWeather(null, null, localStorage.getItem('lastCity') || config.defaultCity);
initRadarTabs();

document.getElementById('wind-toggle-btn')?.addEventListener('click', toggleWind);