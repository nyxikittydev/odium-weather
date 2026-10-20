// Replaces Electron's preload.js + main.js IPC handlers when running inside
// the Android WebView. Same API surface the React app already expects.
(function () {
  var KEY = 'odium-weather-settings';
  var DEFAULTS = { location: null, units: 'imperial', savedLocations: [] };

  function getJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  window.odiumWeather = {
    geocode: function (query) {
      var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(query) + '&count=8&language=en&format=json';
      return getJson(url).then(function (data) {
        var results = (data.results || []).map(function (r) {
          return {
            id: r.id, name: r.name, latitude: r.latitude, longitude: r.longitude,
            country: r.country, admin1: r.admin1 || '', timezone: r.timezone,
            population: r.population || null
          };
        });
        return { ok: true, results: results };
      }).catch(function (e) { return { ok: false, error: e.message, results: [] }; });
    },

    forecast: function (p) {
      var imperial = p.units === 'imperial';
      var params = new URLSearchParams({
        latitude: String(p.latitude),
        longitude: String(p.longitude),
        current: ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
          'is_day', 'precipitation', 'weather_code', 'wind_speed_10m',
          'wind_direction_10m', 'wind_gusts_10m', 'pressure_msl', 'uv_index'].join(','),
        hourly: ['temperature_2m', 'precipitation_probability', 'weather_code', 'wind_speed_10m'].join(','),
        daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min',
          'precipitation_probability_max', 'sunrise', 'sunset', 'uv_index_max'].join(','),
        timezone: 'auto',
        forecast_days: '7',
        temperature_unit: imperial ? 'fahrenheit' : 'celsius',
        wind_speed_unit: imperial ? 'mph' : 'kmh',
        precipitation_unit: imperial ? 'inch' : 'mm'
      });
      return getJson('https://api.open-meteo.com/v1/forecast?' + params.toString())
        .then(function (data) { return { ok: true, data: data }; })
        .catch(function (e) { return { ok: false, error: e.message }; });
    },

    radarFrames: function () {
      return getJson('https://api.rainviewer.com/public/weather-maps.json')
        .then(function (d) {
          return {
            ok: true, host: d.host,
            past: (d.radar && d.radar.past) || [],
            nowcast: (d.radar && d.radar.nowcast) || []
          };
        })
        .catch(function (e) { return { ok: false, error: e.message }; });
    }
  };

  window.odiumSettings = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        var saved = raw ? JSON.parse(raw) : {};
        return Promise.resolve({ ok: true, settings: Object.assign({}, DEFAULTS, saved) });
      } catch (e) {
        return Promise.resolve({ ok: false, error: e.message, settings: DEFAULTS });
      }
    },
    save: function (settings) {
      try {
        localStorage.setItem(KEY, JSON.stringify(settings));
        return Promise.resolve({ ok: true });
      } catch (e) {
        return Promise.resolve({ ok: false, error: e.message });
      }
    }
  };

  // Window chrome doesn't exist on Android; the React app hides these buttons.
  window.odiumWindow = {
    platform: 'android',
    minimize: function () {},
    maximize: function () {},
    close: function () {}
  };
})();
