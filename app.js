// =====================================================================
// DARNOPPLER'S FORECAST — app.js
// Powered by Pirate Weather (pirateweather.net)
// =====================================================================


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
const expandPanel         = document.getElementById('expand-panel');
const weatherCard         = document.getElementById('weather-card');
const spcPanel            = document.getElementById('spc-panel');
const spcBadge            = document.getElementById('spc-badge');
const spcRiskLabel        = document.getElementById('spc-risk-label');
const spcDescription      = document.getElementById('spc-description');
const radarPanelTimestamp = document.getElementById('radar-panel-timestamp');
const radarPanel          = document.getElementById('radar-panel');
const tempPrecipHint      = document.getElementById('temp-precip-hint');
const periodMorn          = document.getElementById('period-morn');
const periodAftn          = document.getElementById('period-aftn');
const periodEve           = document.getElementById('period-eve');
const periodNight         = document.getElementById('period-night');


// ── API ENDPOINTS ─────────────────────────────────────────────────────
const GEO_URL    = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_PROXY_URL = 'https://weather-proxy.derekdhoang.workers.dev';


// ── CONSTANTS ─────────────────────────────────────────────────────────
const RECENT_KEY  = 'darnoppler-recent-searches';
const RECENT_MAX  = 5;
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


// ── HOLIDAY DATA ──────────────────────────────────────────────────────
const HOLIDAYS = {
  '01-01': { name: "New Year's Day",    emoji: '🎆' },
  '01-15': { name: 'MLK Day',           emoji: '✊' },
  '02-14': { name: "Valentine's Day",   emoji: '❤️' },
  '03-17': { name: "St. Patrick's Day", emoji: '🍀' },
  '04-01': { name: "April Fools'",      emoji: '🤡' },
  '04-05': { name: "Easter",            emoji: '🐰' },
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
function saveRecentSearch(city, state, country, lat, lon) {
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
      <span style="flex:1;cursor:pointer;">🕐 ${recent.label}</span>
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
      r2.splice(idx, 1);
      localStorage.setItem(RECENT_KEY, JSON.stringify(r2));
      showRecentSearches();
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

    screenshotPanel.hidden = false;
    cityInput.value = '';

    // Check if location is in USA
    const isUSA = country === 'United States' || country === 'USA' || country === 'US';
    
    if (isUSA) {
      // Show radar panel for US locations
      radarPanel.hidden = false;
      initRadarPreview();
      updatePreviewCityMarker(city, lat, lon);
      loadDrawingsOntoPreview();

      if (isInIowa(lat, lon)) {
        fetchSPCOutlook(lat, lon);
      } else {
        spcPanel.hidden = true;
      }
    } else {
      // Hide radar and SPC panels for non-US locations
      radarPanel.hidden = true;
      spcPanel.hidden = true;
    }

  } catch (err) {
    errorMessage.textContent = err.message || 'Something went wrong. Please try again.';
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
  saveRecentSearch(city, state, country, lat, lon);

  const todayHoliday = getHoliday(new Date());
  if (todayHoliday) {
    holidayBar.textContent = `${todayHoliday.emoji} ${todayHoliday.name}`;
    holidayBar.hidden = false;
  } else {
    holidayBar.hidden = true;
  }

  const icon     = current.icon;
  const iconPath = getIconPath(icon);
  const desc     = current.summary || getIconDescription(icon);

  weatherScene.innerHTML  = `<img src="${iconPath}" alt="${desc}">`;
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

  // Sunrise / Sunset
  const sunriseEl = document.getElementById('sunrise');
  const sunsetEl  = document.getElementById('sunset');
  if (sunriseEl && today.sunriseTime) {
    sunriseEl.textContent = new Date(today.sunriseTime * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (sunsetEl && today.sunsetTime) {
    sunsetEl.textContent = new Date(today.sunsetTime * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  renderTodayPrecipHint(today);
  renderHourlyChart(hourlyData);
}


// ── RENDER FORECAST ───────────────────────────────────────────────────
function renderForecast(dailyData, hourlyData) {
  forecastGrid.innerHTML = '';
  dailyData.forEach((day, index) => {
    forecastGrid.appendChild(buildForecastCard(day, index, hourlyData));
  });
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
function buildForecastCard(day, index, hourlyData) {
  const raw       = new Date(day.time * 1000);
  const date      = new Date(raw.toLocaleDateString('en-US'));
  const dateStr   = raw.toISOString().split('T')[0];
  const dayLabel  = formatDayLabel(date);
  const dateLabel = formatDateLabel(date);
  const high      = Math.round(day.temperatureHigh);
  const low       = Math.round(day.temperatureLow);
  const pop       = Math.round((day.precipProbability || 0) * 100);
  const holiday   = getHoliday(date);

  // Extra data for flip card back
  const windSpeed = Math.round(day.windSpeed || 0);
  const windDir   = getWindDirection(day.windBearing || 0);
  const uvIdx     = Math.round(day.uvIndex || 0);
  const humidPct  = Math.round((day.humidity || 0) * 100);

  const middayEntry  = getHourlyCondition(hourlyData, dateStr, 12);
  const eveningEntry = getHourlyCondition(hourlyData, dateStr, 20);
  const middayIcon   = middayEntry  ? middayEntry.icon  : day.icon;
  const eveningIcon  = eveningEntry ? eveningEntry.icon : day.icon;
  const showNightIndicator = middayIcon !== eveningIcon;
  const middayPath   = getIconPath(middayIcon);
  const eveningPath  = getIconPath(eveningIcon);
  
  // Use daytime condition for description
  const desc         = shortenSummary(day.summary, middayIcon, eveningIcon);
  
  const precipType   = day.precipType || '';
  const isSnow       = precipType === 'snow' || precipType === 'sleet';
  const isRain       = precipType === 'rain';

  const card = document.createElement('div');
  card.className = 'forecast-card';
  card.style.animationDelay = `${index * 70}ms`;

  card.innerHTML = `
    <div class="forecast-card-inner">
      <div class="forecast-card-front">
        ${holiday ? `<div class="holiday-badge">${holiday.emoji} ${holiday.name}</div>` : ''}
        <div class="forecast-day">${dayLabel}</div>
        <div class="forecast-date">${dateLabel}</div>
        <div class="forecast-icon-wrap">
          ${showNightIndicator ? `<img class="forecast-night-indicator" src="${eveningPath}" alt="Night: ${eveningIcon}" title="Tonight">` : ''}
          <img class="forecast-icon" src="${middayPath}" alt="${desc}" loading="lazy">
        </div>
        <div class="forecast-description">${desc}</div>
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
      </div>
      <div class="forecast-card-back">
        <div class="forecast-day">${dayLabel}</div>
        <div class="forecast-back-item">
          <span class="forecast-back-label">Wind</span>
          <span class="forecast-back-value">${windSpeed} mph ${windDir}</span>
        </div>
        <div class="forecast-back-item">
          <span class="forecast-back-label">UV Index</span>
          <span class="forecast-back-value">${uvIdx}</span>
        </div>
        <div class="forecast-back-item">
          <span class="forecast-back-label">Humidity</span>
          <span class="forecast-back-value">${humidPct}%</span>
        </div>
      </div>
    </div>
  `;

  // Flip on click
  card.addEventListener('click', () => {
    card.classList.toggle('flipped');
  });

  return card;
}

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
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  // Each offset = 24 hours forward from current hour
  start.setHours(start.getHours() + offset * 24);
  const end = new Date(start);
  end.setHours(end.getHours() + 24);

  // Nav labels
  const navLabel = document.getElementById('hourly-nav-label');
  const prevBtn  = document.getElementById('hourly-prev');
  const nextBtn  = document.getElementById('hourly-next');

  if (offset === 0) {
    navLabel.textContent = 'Today';
  } else if (offset === 1) {
    navLabel.textContent = 'Tomorrow';
  } else {
    // Day after tomorrow — show the actual weekday name
    const windowDate = new Date(now);
    windowDate.setDate(windowDate.getDate() + offset);
    navLabel.textContent = windowDate.toLocaleDateString('en-US', { weekday: 'long' });
  }

  prevBtn.disabled = offset === 0;
  nextBtn.disabled = offset >= 1; // max 2 clicks = 3 pages total

  const hours = hourlyData.filter(h => {
    const t = new Date(h.time * 1000);
    return t >= start && t < end;
  });

  if (!hours.length) return;

  const nowHour   = now.getHours();
  const labels    = hours.map(h => formatHourLabel(new Date(h.time * 1000)));
  const temps     = hours.map(h => Math.round(h.temperature));
  const feelsLike = hours.map(h => Math.round(h.apparentTemperature || h.temperature));
  const pops      = hours.map(h => Math.round((h.precipProbability || 0) * 100));
  const types     = hours.map(h => h.precipType || 'rain');
  const summaries = hours.map(h => h.summary || '');

  // Current-hour dot only on Today view
  const currentIdx = offset === 0
    ? hours.findIndex(h => new Date(h.time * 1000).getHours() === nowHour)
    : -1;

  // Period labels — find closest hour to each period target
  const findPeriodTemp = (targetHour) => {
    const entry = hours.find(h => new Date(h.time * 1000).getHours() >= targetHour);
    return entry ? Math.round(entry.temperature) + '°F' : '--';
  };

  periodMorn.textContent  = findPeriodTemp(6);
  periodAftn.textContent  = findPeriodTemp(12);
  periodEve.textContent   = findPeriodTemp(18);
  periodNight.textContent = findPeriodTemp(21);

  if (hourlyChart) { hourlyChart.destroy(); hourlyChart = null; }

  const canvas = document.getElementById('hourly-chart');
  const ctx    = canvas.getContext('2d');

  // Horizontal temp gradient: blue (cold) → amber (warm)
  function createTempGradient(chart) {
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return '#93c5fd';
    const g     = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    const minT  = Math.min(...temps);
    const maxT  = Math.max(...temps);
    const range = maxT - minT || 1;
    hours.forEach((h, i) => {
      const ratio = (Math.round(h.temperature) - minT) / range;
      const pos   = i / (hours.length - 1);
      const r  = Math.round(147 + (251 - 147) * ratio);
      const gv = Math.round(197 + (191 - 197) * ratio);
      const b  = Math.round(253 + (36  - 253) * ratio);
      g.addColorStop(Math.min(pos, 1), `rgb(${r},${gv},${b})`);
    });
    return g;
  }

  hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data:                      temps,
          tension:                   0.4,
          borderWidth:               2.5,
          borderColor:               '#93c5fd',
          pointRadius:               (ctx) => ctx.dataIndex === currentIdx ? 7 : 3,
          pointHoverRadius:          7,
          pointBackgroundColor:      (ctx) => ctx.dataIndex === currentIdx ? '#ffffff' : 'rgba(255,255,255,0.4)',
          pointHoverBackgroundColor: '#ffffff',
          pointBorderColor:          (ctx) => ctx.dataIndex === currentIdx ? '#fbbf24' : 'rgba(255,255,255,0.2)',
          pointHoverBorderColor:     '#fbbf24',
          pointBorderWidth:          2,
          pointHoverBorderWidth:     2,
          fill:                      true,
          backgroundColor:           (ctx) => {
            const { chartArea } = ctx.chart;
            if (!chartArea) return 'transparent';
            const grad = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0, 'rgba(147,197,253,0.18)');
            grad.addColorStop(1, 'rgba(147,197,253,0)');
            return grad;
          },
        },
        {
          label: 'Feels Like',
          data:            feelsLike,
          tension:         0.4,
          borderWidth:     1.5,
          borderColor:     'rgba(251,191,36,0.5)',
          borderDash:      [5, 5],
          pointRadius:     0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#fbbf24',
          fill:            false,
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      layout:              { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx      = items[0].dataIndex;
              const hour     = new Date(hours[idx].time * 1000);
              const isToday2 = hour.toDateString() === now.toDateString();
              const prefix   = isToday2 ? '' :
                hour.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ';
              return prefix + formatHourLabel(hour) + (idx === currentIdx ? ' · Now' : '');
            },
            label: (ctx) => {
              const idx = ctx.dataIndex;
              if (ctx.datasetIndex === 0) {
                // Actual temp dataset - use bullet points with spacing
                const lines = [];
                lines.push('');  // Empty line for spacing after title
                lines.push('  — Actual: ' + ctx.raw + '°F');
                
                const feelsLikeTemp = feelsLike[idx];
                if (feelsLikeTemp !== ctx.raw) {
                  lines.push('  - - Feels like: ' + feelsLikeTemp + '°F');
                }
                
                const summary = summaries[idx] || getIconDescription(hours[idx].icon || '');
                if (summary) {
                  lines.push('');  // Spacing
                  lines.push('  • ' + summary);
                }
                
                if (pops[idx] > 0) {
                  const emoji = types[idx] === 'snow' ? '❄️' : '💧';
                  lines.push('  • ' + emoji + ' ' + pops[idx] + '% chance');
                }
                
                return lines;
              }
              // Skip feels like dataset label (we show it inline above)
              return null;
            },
          },
          filter: (item) => item.datasetIndex === 0, // Only show tooltip for actual temp
          backgroundColor: 'rgba(10,22,40,0.95)',
          titleColor:      '#fbbf24',
          titleFont:       { size: 13, weight: 'bold' },
          bodyColor:       'rgba(255,255,255,0.85)',
          bodyFont:        { size: 12 },
          bodySpacing:     4,
          borderColor:     'rgba(255,255,255,0.15)',
          borderWidth:     1,
          padding:         { top: 10, bottom: 12, left: 14, right: 14 },
          displayColors:   false,
        }
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color:       'rgba(255,255,255,0.35)',
            font:        { size: 10 },
            maxRotation: 0,
            // Every 3rd tick on a 24hr span gives clean readable spacing
            callback: (val, idx) => {
              if (idx % 3 !== 0) return '';
              const h = new Date(hours[idx].time * 1000);
              // At midnight show the weekday name instead of 12am
              return h.getHours() === 0
                ? h.toLocaleDateString('en-US', { weekday: 'short' })
                : labels[idx];
            },
          }
        },
        y: {
          position: 'left',
          grid:     { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color:         'rgba(255,255,255,0.35)',
            font:          { size: 10 },
            callback:      (val) => `${val}°`,
            maxTicksLimit: 5,
          },
          grace: '10%',
        }
      }
    }
  });

  // Apply gradient then draw midnight divider — both via rAF so
  // chartArea is guaranteed to exist before we measure anything.
  requestAnimationFrame(() => {
    if (!hourlyChart) return;
    hourlyChart.data.datasets[0].borderColor = createTempGradient(hourlyChart);
    hourlyChart.update('none');

    requestAnimationFrame(() => {
      if (!hourlyChart) return;
      const c = hourlyChart.ctx;
      const x = hourlyChart.scales.x;
      const y = hourlyChart.scales.y;
      if (!x || !y) return;

      hours.forEach((h, i) => {
        const hour = new Date(h.time * 1000);
        if (hour.getHours() !== 0) return;

        const xPos = x.getPixelForIndex(i);

        // Dashed vertical line
        c.save();
        c.beginPath();
        c.setLineDash([4, 4]);
        c.strokeStyle = 'rgba(255,255,255,0.2)';
        c.lineWidth   = 1;
        c.moveTo(xPos, y.top);
        c.lineTo(xPos, y.bottom);
        c.stroke();

        // Day label above the line
        const dayStr = hour.toLocaleDateString('en-US', {
          weekday: 'short', month: 'numeric', day: 'numeric'
        });
        c.setLineDash([]);
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.font      = '10px system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText(dayStr, xPos, y.top - 4);
        c.restore();
      });
    });
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


// ── RADAR PREVIEW MAP — NOAA WMS ──────────────────────────────────────
function initRadarPreview() {
  if (previewMap) {
    refreshRadarPreview();
    loadDrawingsOntoPreview();
    return;
  }

  previewMap = L.map('radar-preview-map', {
    center:          [41.878, -93.097],
    zoom:            5,
    zoomControl:     false,
    scrollWheelZoom: true,
    dragging:        true,
    doubleClickZoom: true,
    keyboard:        false,
  });

  // Lighter dark-grey basemap
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19, opacity: 1, zIndex: 1 }
  ).addTo(previewMap);

  // City/state labels on top of radar — same as studio
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '', maxZoom: 19, opacity: 1, zIndex: 450 }
  ).addTo(previewMap);

  loadPreviewStateBoundaries();
  refreshRadarPreview();
  loadDrawingsOntoPreview();

  previewMap.on('zoomend', () => {
    if (!previewRadar) return;
    const z = previewMap.getZoom();
    previewRadar.setOpacity(z <= 6 ? 1 : z <= 8 ? 0.75 : z <= 10 ? 0.45 : 0.25);
  });
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

function refreshRadarPreview() {
  if (!previewMap) return;
  if (previewRadar) { previewMap.removeLayer(previewRadar); previewRadar = null; }

  previewRadar = L.tileLayer.wms(
    'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity/MapServer/WMSServer',
    { layers: '0', format: 'image/png', transparent: true, opacity: 0.55, attribution: 'NOAA NWS', zIndex: 200 }
  ).addTo(previewMap);

  radarPanelTimestamp.textContent = 'NOAA NWS · Updated ' +
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

setInterval(refreshRadarPreview, 10 * 60 * 1000);

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
  if (hourlyOffset < 2) { hourlyOffset++; renderHourlyChart(storedHourly, hourlyOffset); }
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
  const tabRadar  = document.getElementById('tab-radar');
  const tabSpc    = document.getElementById('tab-spc');
  const radarView = document.getElementById('radar-view');
  const spcView   = document.getElementById('spc-view');
  if (!tabRadar || !tabSpc) return;

  // Apply uniform attribution to preview map once it exists
  if (previewMap) applyUniformAttribution(previewMap);

  tabRadar.addEventListener('click', () => {
    tabRadar.classList.add('active');
    tabSpc.classList.remove('active');
    radarView.hidden = false;
    spcView.hidden   = true;
    if (previewMap) setTimeout(() => previewMap.invalidateSize(), 50);
  });

  tabSpc.addEventListener('click', () => {
    tabSpc.classList.add('active');
    tabRadar.classList.remove('active');
    spcView.hidden   = false;
    radarView.hidden = true;
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
    center: [38.5, -96.0], zoom: 4,
    zoomControl: false, scrollWheelZoom: true, dragging: true,
    attributionControl: true,
  });

  // Same lighter grey basemap as preview radar
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19, opacity: 1 }
  ).addTo(spcOutlookMap);

  // City/state labels on top
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '', maxZoom: 19, opacity: 1, zIndex: 450 }
  ).addTo(spcOutlookMap);

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