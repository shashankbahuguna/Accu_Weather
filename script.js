/* ===================================
   MODERN WEATHER APP - SYNCHRONIZED JAVASCRIPT
   =================================== */

// API Configuration
const CONFIG = {
    // NOTE: Replace 'YOUR_OPENWEATHERMAP_API_KEY' with your actual key
    API_KEY: '83de9879bcc27f5b9a57edb8ac7900f8', // Using the provided key
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    UNITS: 'metric',
    DEFAULT_CITY: 'Tokyo',
    CACHE_DURATION: 300000 // 5 minutes
};

// DOM Elements
const elements = {
    // App & Header
    appWrapper: document.getElementById('appWrapper'),
    currentTime: document.getElementById('currentTime'),
    themeToggle: document.getElementById('themeToggle'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorToast: document.getElementById('errorToast'),
    toastMessage: document.getElementById('toastMessage'),
    weatherBg: document.getElementById('weatherBg'),
    
    // Search
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    
    // Current Weather Card
    cityName: document.getElementById('cityName'),
    countryName: document.getElementById('countryName'),
    currentDate: document.getElementById('currentDate'),
    localTime: document.getElementById('localTime'),
    temperature: document.getElementById('temperature'),
    feelsLike: document.getElementById('feelsLike'),
    tempMin: document.getElementById('tempMin'),
    tempMax: document.getElementById('tempMax'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherCondition: document.getElementById('weatherCondition'),
    weatherDescription: document.getElementById('weatherDescription'),
    windSpeed: document.getElementById('windSpeed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    uvIndex: document.getElementById('uvIndex'),
    cloudiness: document.getElementById('cloudiness'),

    // Sidebar
    hourlyForecast: document.getElementById('hourlyForecast'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    sunPosition: document.getElementById('sunPosition'),
    aqiValue: document.getElementById('aqiValue'),
    aqiStatus: document.getElementById('aqiStatus'),
    aqiCircle: document.getElementById('aqiCircle'),
    
    // Forecast
    forecastGrid: document.getElementById('forecastGrid'),
};

// Cache and State (Simplified)
const cache = { data: {}, set(k, v) { this.data[k] = { value: v, timestamp: Date.now() }; }, get(k) { const cached = this.data[k]; return cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION ? cached.value : null; } };
const state = { theme: localStorage.getItem('theme') || 'light' };

/* ===================================
   INITIALIZATION
   =================================== */
function init() {
    updateDateTime();
    setInterval(updateDateTime, 30000); // Update time every 30 seconds
    
    loadTheme();
    initEventListeners();
    
    if (navigator.geolocation) {
        getUserLocation();
    } else {
        fetchWeatherByCity(CONFIG.DEFAULT_CITY);
    }
}

/* ===================================
   DATE & TIME FUNCTIONS
   =================================== */
function updateDateTime() {
    const now = new Date();
    
    if (elements.currentTime) {
        elements.currentTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    if (elements.currentDate) {
        elements.currentDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
}

function formatTime(timestamp, timezone = 0) {
    const localTimeMs = (timestamp + timezone) * 1000;
    const date = new Date(localTimeMs);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ===================================
   GEOLOCATION & SEARCH
   =================================== */
function getUserLocation() {
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            hideLoading();
            showError('Location access denied. Showing default city.');
            fetchWeatherByCity(CONFIG.DEFAULT_CITY);
        }
    );
}

function handleSearch() {
    const city = elements.cityInput?.value.trim();
    if (city) {
        fetchWeatherByCity(city);
    } else {
        showError('Please enter a city name');
    }
}


/* ===================================
   API CALLS (Unified Fetch)
   =================================== */
async function fetchData(endpoint, params) {
    const url = `${CONFIG.BASE_URL}/${endpoint}?${params}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found. Please check the spelling.');
        }
        throw new Error('Failed to fetch weather data');
    }
    return await response.json();
}

async function fetchWeatherByCity(city) {
    if (!city || city.trim() === '') return;
    const cacheKey = `weather_${city.toLowerCase()}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        displayAllWeatherData(cachedData);
        return;
    }
    
    showLoading();
    try {
        const [currentWeather, forecast] = await Promise.all([
            fetchData('weather', `q=${encodeURIComponent(city)}`),
            fetchData('forecast', `q=${encodeURIComponent(city)}`)
        ]);

        const weatherData = { current: currentWeather, forecast: forecast };
        cache.set(cacheKey, weatherData);
        displayAllWeatherData(weatherData);
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}

async function fetchWeatherByCoords(lat, lon) {
    const cacheKey = `coords_${lat}_${lon}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        displayAllWeatherData(cachedData);
        return;
    }

    showLoading();
    try {
        const [currentWeather, forecast] = await Promise.all([
            fetchData('weather', `lat=${lat}&lon=${lon}`),
            fetchData('forecast', `lat=${lat}&lon=${lon}`)
        ]);

        const weatherData = { current: currentWeather, forecast: forecast };
        cache.set(cacheKey, weatherData);
        displayAllWeatherData(weatherData);
    } catch (error) {
        handleError(error);
    } finally {
        hideLoading();
    }
}


/* ===================================
   DISPLAY FUNCTIONS
   =================================== */
function displayAllWeatherData(data) {
    displayCurrentWeather(data.current);
    displayHourlyForecast(data.forecast);
    displayDailyForecast(data.forecast);
    updateBackground(data.current.weather[0].main);
    // Mocking Air Quality and UV Index as a fallback for missing API endpoints
    displayAirQuality(data.current.coord.lat, data.current.coord.lon);
}

function displayCurrentWeather(data) {
    // Location Info
    elements.cityName.textContent = data.name;
    elements.countryName.textContent = data.sys.country;

    // Time & Date
    const localDateTime = new Date((Date.now() / 1000 + data.timezone - (new Date().getTimezoneOffset() * 60)) * 1000);
    elements.localTime.textContent = localDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Temperature
    elements.temperature.textContent = Math.round(data.main.temp);
    elements.feelsLike.textContent = Math.round(data.main.feels_like);
    elements.tempMin.textContent = Math.round(data.main.temp_min);
    elements.tempMax.textContent = Math.round(data.main.temp_max);

    // Condition
    const condition = data.weather[0];
    elements.weatherCondition.textContent = condition.main;
    elements.weatherDescription.textContent = condition.description;
    const iconUrl = `https://openweathermap.org/img/wn/${condition.icon}@2x.png`;
    elements.weatherIcon.src = iconUrl;
    elements.weatherIcon.alt = condition.description;

    // Metrics
    elements.windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`; // m/s to km/h
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    elements.visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    elements.cloudiness.textContent = `${data.clouds.all}%`;
    
    // Sun Info
    elements.sunrise.textContent = formatTime(data.sys.sunrise, data.timezone);
    elements.sunset.textContent = formatTime(data.sys.sunset, data.timezone);
    updateSunPosition(data.sys.sunrise, data.sys.sunset, data.timezone);
}

function displayHourlyForecast(data) {
    if (!elements.hourlyForecast) return;
    elements.hourlyForecast.innerHTML = '';
    
    // Get next 8 entries (24 hours)
    const hourlyData = data.list.slice(0, 8);
    
    hourlyData.forEach((hour, index) => {
        const date = new Date(hour.dt * 1000);
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.style.animationDelay = `${index * 0.05}s`;
        
        hourItem.innerHTML = `
            <p class="hourly-time">${time}</p>
            <div class="hourly-icon">
                <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}.png" 
                     alt="${hour.weather[0].description}">
            </div>
            <p class="hourly-temp">${Math.round(hour.main.temp)}°</p>
        `;
        elements.hourlyForecast.appendChild(hourItem);
    });
}

function displayDailyForecast(data) {
    if (!elements.forecastGrid) return;
    elements.forecastGrid.innerHTML = '';
    
    const dailyForecasts = getDailyForecasts(data.list);
    
    dailyForecasts.forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item glass-card';
        
        forecastItem.innerHTML = `
            <p class="forecast-day-name">${dayName}</p>
            <p class="forecast-date">${dateStr}</p>
            <div class="forecast-icon">
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" 
                     alt="${day.weather[0].description}">
            </div>
            <div class="forecast-temps">
                <span class="forecast-temp-max">${Math.round(day.main.temp_max)}°</span>
                <span class="forecast-temp-min">${Math.round(day.main.temp_min)}°</span>
            </div>
            <p class="forecast-condition">${day.weather[0].description}</p>
        `;
        elements.forecastGrid.appendChild(forecastItem);
    });
}

function getDailyForecasts(list) {
    const daily = [];
    const days = {};
    
    // Group all 3-hour forecasts by day
    list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!days[date]) days[date] = [];
        days[date].push(item);
    });
    
    // Select one representative entry per day (ideally close to noon)
    Object.values(days).forEach(dayData => {
        const noon = dayData.find(item => new Date(item.dt * 1000).getHours() === 12);
        daily.push(noon || dayData[Math.floor(dayData.length / 2)]);
    });
    
    return daily.slice(0, 5); // Return the next 5 days
}

function updateSunPosition(sunrise, sunset, timezone) {
    if (!elements.sunPosition) return;
    
    const nowLocal = (Date.now() / 1000) + timezone - (new Date().getTimezoneOffset() * 60);
    
    // Convert to the location's local time
    const sunriseLocal = sunrise + timezone - (new Date().getTimezoneOffset() * 60);
    const sunsetLocal = sunset + timezone - (new Date().getTimezoneOffset() * 60);

    const totalDaylight = sunsetLocal - sunriseLocal;
    const currentPosition = nowLocal - sunriseLocal;
    
    let percentage = 0;
    if (currentPosition > 0 && currentPosition < totalDaylight) {
        percentage = (currentPosition / totalDaylight) * 100;
    } else if (currentPosition >= totalDaylight) {
        percentage = 100; // After sunset
    }
    
    // Calculate arc position: x = percentage, y = sin(percentage * PI)
    const x = Math.max(0, Math.min(100, percentage));
    const y = Math.sin((x / 100) * Math.PI) * 100;

    elements.sunPosition.style.left = `${x}%`;
    elements.sunPosition.style.bottom = `${y}%`;
}


/* ===================================
   MOCK/FALLBACK FUNCTIONS
   =================================== */
// NOTE: OpenWeatherMap Air Quality API requires a separate subscription/endpoint.
// This function mocks the data based on general principles.
function displayAirQuality(lat, lon) {
    // In a real app, you would fetch: 
    // const aqiData = await fetchData('air_pollution', `lat=${lat}&lon=${lon}`);
    
    // Mock Data based on random number for visual effect
    const aqi = Math.floor(Math.random() * 200) + 10;
    let status = 'Good';
    let statusText = 'Air quality is excellent. Enjoy the outdoors!';

    if (aqi > 100) {
        status = 'Unhealthy';
        statusText = 'Air quality is poor. Limit prolonged outdoor exertion.';
    } else if (aqi > 50) {
        status = 'Moderate';
        statusText = 'Air quality is acceptable. Unusually sensitive people should be cautious.';
    }

    elements.aqiValue.textContent = aqi;
    elements.aqiStatus.textContent = statusText;
    elements.aqiCircle.setAttribute('data-status', status);
    elements.uvIndex.textContent = Math.floor(Math.random() * 10) + 1; // Mock UV
}


/* ===================================
   BACKGROUND & UI UTILITIES
   =================================== */
function updateBackground(weatherCondition) {
    if (!elements.weatherBg) return;
    
    const condition = weatherCondition.toLowerCase();
    elements.weatherBg.className = 'weather-background'; // Reset
    
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;

    if (condition.includes('clear')) {
        elements.weatherBg.classList.add(isDay ? 'clear-day' : 'clear-night');
    } else if (condition.includes('cloud')) {
        elements.weatherBg.classList.add('cloudy');
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
        elements.weatherBg.classList.add('rainy');
    } else if (condition.includes('snow')) {
        elements.weatherBg.classList.add('snowy');
    } else if (condition.includes('thunder')) {
        elements.weatherBg.classList.add('stormy');
    }
}

function showLoading() {
    elements.appWrapper?.classList.add('hidden'); // Hide content while loading
    elements.loadingOverlay?.classList.add('active');
}

function hideLoading() {
    elements.appWrapper?.classList.remove('hidden');
    elements.loadingOverlay?.classList.remove('active');
}

function showError(message) {
    elements.toastMessage.textContent = message;
    elements.errorToast.classList.add('show');
    
    setTimeout(() => {
        elements.errorToast.classList.remove('show');
    }, 4000);
}

function handleError(error) {
    console.error('Weather app error:', error);
    let message = 'An error occurred. Please try again.';
    if (error.message.includes('City not found')) {
        message = 'City not found. Please check the spelling.';
    } else if (error.message.includes('Failed to fetch')) {
        message = 'Network error. Please check your internet connection.';
    }
    showError(message);
}

/* ===================================
   THEME TOGGLE
   =================================== */
function loadTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    
    if (elements.themeToggle) {
        const icon = elements.themeToggle.querySelector('i');
        if (icon) {
            icon.className = state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    loadTheme();
}


/* ===================================
   EVENT LISTENERS
   =================================== */
function initEventListeners() {
    elements.searchBtn?.addEventListener('click', handleSearch);
    elements.locationBtn?.addEventListener('click', getUserLocation);
    elements.themeToggle?.addEventListener('click', toggleTheme);
    
    elements.cityInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);