
      // Weather code to emoji mapping
      const weatherIcons = {
        0: "☀️",
        1: "🌤️",
        2: "⛅",
        3: "☁️",
        45: "🌫️",
        48: "🌫️",
        51: "🌦️",
        53: "🌦️",
        55: "🌧️",
        61: "🌧️",
        63: "🌧️",
        65: "🌧️",
        71: "🌨️",
        73: "🌨️",
        75: "❄️",
        77: "❄️",
        80: "🌦️",
        81: "🌧️",
        82: "🌧️",
        85: "🌨️",
        86: "❄️",
        95: "⛈️",
        96: "⛈️",
        99: "⛈️",
      };

      const weatherDescriptions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
      };

      let currentWeatherData = null;
      let currentUnit = "celsius";

      function showLoading() {
        document.getElementById("loading").style.display = "block";
        document.getElementById("error").style.display = "none";
        document.getElementById("weatherDisplay").classList.remove("visible");
      }

      function hideLoading() {
        document.getElementById("loading").style.display = "none";
      }

      function showError(message) {
        document.getElementById("error").textContent = message;
        document.getElementById("error").style.display = "block";
        hideLoading();
      }

      function handleKeyPress(event) {
        if (event.key === "Enter") {
          searchWeather();
        }
      }

      function celsiusToFahrenheit(celsius) {
        return (celsius * 9) / 5 + 32;
      }

      function fahrenheitToCelsius(fahrenheit) {
        return ((fahrenheit - 32) * 5) / 9;
      }

      function toggleTemperature(unit) {
        if (!currentWeatherData) return;

        currentUnit = unit;

        // Update button states
        document
          .getElementById("celsiusBtn")
          .classList.toggle("active", unit === "celsius");
        document
          .getElementById("fahrenheitBtn")
          .classList.toggle("active", unit === "fahrenheit");

        // Update temperature display
        const tempCelsius = currentWeatherData.current.temperature_2m;
        const feelsLikeCelsius =
          currentWeatherData.current.apparent_temperature;

        if (unit === "celsius") {
          document.getElementById("temperature").textContent = `${Math.round(
            tempCelsius
          )}°C`;
          updateFeelsLikeTemp(feelsLikeCelsius, "celsius");
        } else {
          const tempFahrenheit = celsiusToFahrenheit(tempCelsius);
          const feelsLikeFahrenheit = celsiusToFahrenheit(feelsLikeCelsius);
          document.getElementById("temperature").textContent = `${Math.round(
            tempFahrenheit
          )}°F`;
          updateFeelsLikeTemp(feelsLikeFahrenheit, "fahrenheit");
        }
      }

      function updateFeelsLikeTemp(temp, unit) {
        const feelsLikeElement = document.querySelector(
          ".detail-item:first-child .detail-value"
        );
        if (feelsLikeElement) {
          feelsLikeElement.textContent = `${Math.round(temp)}°${
            unit === "celsius" ? "C" : "F"
          }`;
        }
      }

      async function getCurrentLocation() {
        showLoading();

        if (!navigator.geolocation) {
          showError("Geolocation is not supported by this browser.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            await getWeatherData(lat, lon, null, null, true);
          },
          (error) => {
            let message = "Unable to retrieve your location. ";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message += "Location access denied by user.";
                break;
              case error.POSITION_UNAVAILABLE:
                message += "Location information is unavailable.";
                break;
              case error.TIMEOUT:
                message += "Location request timed out.";
                break;
              default:
                message += "An unknown error occurred.";
                break;
            }
            showError(message);
          }
        );
      }

      async function searchWeather() {
        const locationInput = document.getElementById("locationInput");
        const location = locationInput.value.trim();

        if (!location) {
          showError("Please enter a location.");
          return;
        }

        showLoading();

        try {
          const geocodeResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
              location
            )}&count=1&language=en&format=json`
          );
          const geocodeData = await geocodeResponse.json();

          if (!geocodeData.results || geocodeData.results.length === 0) {
            showError("Location not found. Please try a different location.");
            return;
          }

          const result = geocodeData.results[0];
          await getWeatherData(
            result.latitude,
            result.longitude,
            result.name,
            result.country,
            false
          );
        } catch (error) {
          showError("Error fetching location data. Please try again.");
        }
      }

      async function getWeatherData(
        lat,
        lon,
        cityName = null,
        country = null,
        isCurrentLocation = false
      ) {
        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max&timezone=auto`
          );
          const data = await response.json();

          if (data.error) {
            showError("Error fetching weather data: " + data.reason);
            return;
          }

          currentWeatherData = data;

          // If using current location, get the city name from reverse geocoding
          if (isCurrentLocation) {
            try {
              const reverseGeoResponse = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`
              );
              const reverseGeoData = await reverseGeoResponse.json();

              if (reverseGeoData.results && reverseGeoData.results.length > 0) {
                const result = reverseGeoData.results[0];
                displayWeatherData(data, lat, lon, result.name, result.country);
              } else {
                displayWeatherData(data, lat, lon, "Current Location", "");
              }
            } catch (error) {
              displayWeatherData(data, lat, lon, "Current Location", "");
            }
          } else {
            displayWeatherData(data, lat, lon, cityName, country);
          }
        } catch (error) {
          showError("Error fetching weather data. Please try again.");
        }
      }

      function displayWeatherData(
        data,
        lat,
        lon,
        cityName = null,
        country = null
      ) {
        hideLoading();

        const current = data.current;
        const daily = data.daily;

        // Display location name
        let locationName = cityName || "Current Location";
        if (country && cityName) {
          locationName += `, ${country}`;
        }
        document.getElementById("locationName").textContent = locationName;

        // Display coordinates
        document.getElementById("coordinates").textContent = `${lat.toFixed(
          4
        )}°, ${lon.toFixed(4)}°`;

        // Display temperature based on current unit
        const tempCelsius = current.temperature_2m;
        const feelsLikeCelsius = current.apparent_temperature;

        if (currentUnit === "celsius") {
          document.getElementById("temperature").textContent = `${Math.round(
            tempCelsius
          )}°C`;
        } else {
          const tempFahrenheit = celsiusToFahrenheit(tempCelsius);
          document.getElementById("temperature").textContent = `${Math.round(
            tempFahrenheit
          )}°F`;
        }

        // Display weather icon and description
        const weatherCode = current.weather_code;
        document.getElementById("weatherIcon").textContent =
          weatherIcons[weatherCode] || "🌤️";
        document.getElementById("weatherDescription").textContent =
          weatherDescriptions[weatherCode] || "Unknown";

        // Display detailed weather information
        const feelsLikeTemp =
          currentUnit === "celsius"
            ? `${Math.round(feelsLikeCelsius)}°C`
            : `${Math.round(celsiusToFahrenheit(feelsLikeCelsius))}°F`;

        const windSpeedKmh = current.wind_speed_10m;

        const detailsContainer = document.getElementById("weatherDetails");
        detailsContainer.innerHTML = `
                <div class="detail-item">
                    <div class="detail-label">Feels Like</div>
                    <div class="detail-value">${feelsLikeTemp}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Humidity</div>
                    <div class="detail-value">${
                      current.relative_humidity_2m
                    }%</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Wind Speed</div>
                    <div class="detail-value">${Math.round(
                      windSpeedKmh
                    )} km/h</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Pressure</div>
                    <div class="detail-value">${Math.round(
                      current.pressure_msl
                    )} hPa</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Cloud Cover</div>
                    <div class="detail-value">${current.cloud_cover}%</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">UV Index</div>
                    <div class="detail-value">${
                      Math.round(daily.uv_index_max[0]) || "N/A"
                    }</div>
                </div>
            `;

        // Show weather display with animation
        document.getElementById("weatherDisplay").classList.add("visible");
      }
   