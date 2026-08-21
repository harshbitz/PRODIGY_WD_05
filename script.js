// Elements
const body = document.getElementById('body');
const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const locateBtn = document.getElementById('locateBtn');
const loadingMsg = document.getElementById('loadingMsg');
const errorEl = document.getElementById('errorMsg');
const resultEl = document.getElementById('result');
const cBtn = document.getElementById('cBtn');
const fBtn = document.getElementById('fBtn');

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Maps WMO weather codes to a description, emoji, and a background "theme"
const WEATHER_CODES = {
  0: ['Clear Sky', '☀️', 'sunny'],
  1: ['Mainly Clear', '🌤️', 'sunny'],
  2: ['Partly Cloudy', '⛅', 'cloudy'],
  3: ['Overcast', '☁️', 'cloudy'],
  45: ['Fog', '🌫️', 'cloudy'],
  48: ['Rime Fog', '🌫️', 'cloudy'],
  51: ['Light Drizzle', '🌦️', 'rainy'],
  53: ['Drizzle', '🌦️', 'rainy'],
  55: ['Dense Drizzle', '🌦️', 'rainy'],
  61: ['Slight Rain', '🌧️', 'rainy'],
  63: ['Rain', '🌧️', 'rainy'],
  65: ['Heavy Rain', '🌧️', 'rainy'],
  71: ['Slight Snow', '🌨️', 'snowy'],
  73: ['Snow', '🌨️', 'snowy'],
  75: ['Heavy Snow', '❄️', 'snowy'],
  80: ['Rain Showers', '🌦️', 'rainy'],
  81: ['Rain Showers', '🌦️', 'rainy'],
  82: ['Violent Showers', '⛈️', 'stormy'],
  95: ['Thunderstorm', '⛈️', 'stormy'],
  96: ['Thunderstorm w/ Hail', '⛈️', 'stormy'],
  99: ['Thunderstorm w/ Hail', '⛈️', 'stormy'],
};

let lastTempC = null; // stored so the °C/°F toggle can re-render without a new API call
let currentUnit = 'C';

function showLoading() {
  errorEl.textContent = '';
  resultEl.classList.add('hidden');
  loadingMsg.classList.remove('hidden');
}

function showError(msg) {
  loadingMsg.classList.add('hidden');
  resultEl.classList.add('hidden');
  errorEl.textContent = msg;
}

function renderWeather(name, current) {
  loadingMsg.classList.add('hidden');
  errorEl.textContent = '';
  resultEl.classList.remove('hidden');

  const [description, emoji, theme] = WEATHER_CODES[current.weather_code] || ['Unknown', '🌡️', 'sunny'];

  lastTempC = current.temperature_2m;

  document.getElementById('place').textContent = name;
  document.getElementById('icon').textContent = emoji;
  document.getElementById('condition').textContent = description;
  document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('wind').textContent = `${current.wind_speed_10m} km/h`;

  renderTemperature();

  // Swap the page background to match the weather
  body.className = theme;
}

function renderTemperature() {
  if (lastTempC === null) return;
  const temp = currentUnit === 'C' ? lastTempC : (lastTempC * 9) / 5 + 32;
  document.getElementById('temp').textContent = `${Math.round(temp)}°${currentUnit}`;
}

// ---------- Unit toggle ----------
cBtn.addEventListener('click', () => {
  currentUnit = 'C';
  cBtn.classList.add('active');
  fBtn.classList.remove('active');
  renderTemperature();
});

fBtn.addEventListener('click', () => {
  currentUnit = 'F';
  fBtn.classList.add('active');
  cBtn.classList.remove('active');
  renderTemperature();
});

// ---------- Geocoding + forecast ----------
async function geocodeCity(city) {
  const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Couldn't find "${city}". Try a different spelling.`);
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, label: country ? `${name}, ${country}` : name };
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude, longitude,
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error('Weather service is unavailable right now.');
  const data = await res.json();
  return data.current;
}

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  showLoading();
  try {
    const { latitude, longitude, label } = await geocodeCity(city);
    const current = await fetchWeather(latitude, longitude);
    renderWeather(label, current);
  } catch (err) {
    showError(err.message);
  }
});

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const current = await fetchWeather(latitude, longitude);
        renderWeather('Your Location', current);
      } catch (err) {
        showError(err.message);
      }
    },
    () => showError('Location access was denied.')
  );
});