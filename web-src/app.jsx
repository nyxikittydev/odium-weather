import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, MapPin, Minus, Square, X, Settings, Droplets, Wind, Gauge,
  Sunrise, Sunset, Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning,
  CloudDrizzle, Eye, Thermometer, ChevronLeft, ChevronRight, Play, Pause, Star,
} from 'lucide-react';

const ACCENT = '#e91f42';
const ACCENT_RGB = '233, 31, 66';

const WMO_CODES = {
  0: { label: 'Clear sky', icon: Sun },
  1: { label: 'Mostly clear', icon: Sun },
  2: { label: 'Partly cloudy', icon: Cloud },
  3: { label: 'Overcast', icon: Cloud },
  45: { label: 'Fog', icon: CloudFog },
  48: { label: 'Freezing fog', icon: CloudFog },
  51: { label: 'Light drizzle', icon: CloudDrizzle },
  53: { label: 'Drizzle', icon: CloudDrizzle },
  55: { label: 'Dense drizzle', icon: CloudDrizzle },
  56: { label: 'Light freezing drizzle', icon: CloudDrizzle },
  57: { label: 'Freezing drizzle', icon: CloudDrizzle },
  61: { label: 'Light rain', icon: CloudRain },
  63: { label: 'Rain', icon: CloudRain },
  65: { label: 'Heavy rain', icon: CloudRain },
  66: { label: 'Light freezing rain', icon: CloudRain },
  67: { label: 'Freezing rain', icon: CloudRain },
  71: { label: 'Light snow', icon: CloudSnow },
  73: { label: 'Snow', icon: CloudSnow },
  75: { label: 'Heavy snow', icon: CloudSnow },
  77: { label: 'Snow grains', icon: CloudSnow },
  80: { label: 'Light showers', icon: CloudRain },
  81: { label: 'Showers', icon: CloudRain },
  82: { label: 'Violent showers', icon: CloudRain },
  85: { label: 'Light snow showers', icon: CloudSnow },
  86: { label: 'Snow showers', icon: CloudSnow },
  95: { label: 'Thunderstorm', icon: CloudLightning },
  96: { label: 'Thunderstorm, light hail', icon: CloudLightning },
  99: { label: 'Thunderstorm, heavy hail', icon: CloudLightning },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { label: 'Unknown', icon: Cloud };
}

function windDirectionLabel(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDayLabel(isoString, index) {
  if (index === 0) return 'Today';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function TitleBar({ onOpenSearch }) {
  const isAndroid = window.odiumWindow && window.odiumWindow.platform === 'android';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isAndroid ? '0 4px 0 16px' : '0 0 0 16px', height: '44px', flexShrink: 0, WebkitAppRegion: 'drag', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9a9a9a' }}>
        <Cloud size={14} style={{ color: ACCENT }} />
        Odium Weather
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onOpenSearch}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: 'transparent', border: 'none', color: '#c8c8c8', cursor: 'pointer' }}
          aria-label="Change location"
          title="Change location"
        >
          <Search size={16} />
        </button>
        {!isAndroid && (
          <>
            <button onClick={() => window.odiumWindow.minimize()} style={titleBtnStyle()} aria-label="Minimize"><Minus size={14} /></button>
            <button onClick={() => window.odiumWindow.maximize()} style={titleBtnStyle()} aria-label="Maximize"><Square size={12} /></button>
            <button onClick={() => window.odiumWindow.close()} style={titleBtnStyle()} aria-label="Close"><X size={14} /></button>
          </>
        )}
      </div>
    </div>
  );
}

function titleBtnStyle() {
  return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '38px', background: 'transparent', border: 'none', color: '#9a9a9a', cursor: 'pointer' };
}

function LocationSearch({ onSelect, onClose, savedLocations, onRemoveSaved }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await window.odiumWeather.geocode(query.trim());
      setLoading(false);
      if (res.ok) setResults(res.results);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', zIndex: 300 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(420px, 94vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(165deg, #1c1c1c 0%, #121212 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Search size={15} style={{ color: '#9a9a9a', flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city or zip..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#f2f2f2', fontSize: '14px', outline: 'none' }}
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9a9a9a', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {!query && savedLocations.length > 0 && (
            <>
              <div style={{ fontSize: '10.5px', color: '#7a7a7a', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px' }}>Saved</div>
              {savedLocations.map((loc) => (
                <div
                  key={`${loc.latitude}-${loc.longitude}`}
                  onClick={() => onSelect(loc)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <MapPin size={15} style={{ color: ACCENT, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#e8e8e8' }}>{loc.name}</div>
                    <div style={{ fontSize: '11px', color: '#8a8a8a' }}>{loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveSaved(loc); }}
                    style={{ background: 'transparent', border: 'none', color: '#6a6a6a', cursor: 'pointer', display: 'flex' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </>
          )}

          {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#7a7a7a', fontSize: '12.5px' }}>Searching...</div>}

          {!loading && query && results.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7a7a7a', fontSize: '12.5px' }}>No results for "{query}"</div>
          )}

          {results.map((loc) => (
            <div
              key={loc.id}
              onClick={() => onSelect(loc)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MapPin size={15} style={{ color: '#9a9a9a', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#e8e8e8' }}>{loc.name}</div>
                <div style={{ fontSize: '11px', color: '#8a8a8a' }}>{loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CurrentConditions({ location, current, units, onOpenSearch, isSaved, onToggleSave }) {
  const info = getWeatherInfo(current.weather_code);
  const Icon = info.icon;
  const tempUnit = units === 'imperial' ? '°F' : '°C';
  const windUnit = units === 'imperial' ? 'mph' : 'km/h';

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        onClick={onOpenSearch}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', alignSelf: 'flex-start', padding: '4px 8px', borderRadius: '8px', marginLeft: '-8px' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <MapPin size={14} style={{ color: ACCENT }} />
        <span style={{ fontSize: '14px', color: '#e8e8e8', fontWeight: 500 }}>{location.name}</span>
        <ChevronRight size={13} style={{ color: '#7a7a7a' }} />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
        >
          <Star size={13} style={{ color: isSaved ? ACCENT : '#5a5a5a', fill: isSaved ? ACCENT : 'none' }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '8px' }}>
        <Icon size={64} style={{ color: ACCENT, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '52px', fontWeight: 700, lineHeight: 1, color: '#f5f5f5' }}>
            {Math.round(current.temperature_2m)}{tempUnit}
          </div>
          <div style={{ fontSize: '14px', color: '#a8a8a8', marginTop: '2px' }}>
            {info.label} · Feels like {Math.round(current.apparent_temperature)}{tempUnit}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '16px' }}>
        <MiniStat icon={Droplets} label="Humidity" value={`${current.relative_humidity_2m}%`} />
        <MiniStat icon={Wind} label="Wind" value={`${Math.round(current.wind_speed_10m)} ${windUnit} ${windDirectionLabel(current.wind_direction_10m)}`} />
        <MiniStat icon={Gauge} label="Pressure" value={`${Math.round(current.pressure_msl)} hPa`} />
        <MiniStat icon={Eye} label="UV Index" value={current.uv_index != null ? current.uv_index.toFixed(1) : '—'} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8a8a8a', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Icon size={11} />
        {label}
      </div>
      <div style={{ fontSize: '14px', color: '#e8e8e8', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function HourlyScroller({ hourly }) {
  const now = new Date();
  const startIdx = hourly.time.findIndex((t) => new Date(t) >= now);
  const sliceStart = Math.max(0, startIdx);
  const items = hourly.time.slice(sliceStart, sliceStart + 24).map((t, i) => ({
    time: t,
    temp: hourly.temperature_2m[sliceStart + i],
    precipProb: hourly.precipitation_probability[sliceStart + i],
    code: hourly.weather_code[sliceStart + i],
  }));

  return (
    <div style={{ padding: '0 24px 20px' }}>
      <div style={{ fontSize: '11px', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Hourly forecast</div>
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
        {items.map((item, i) => {
          const info = getWeatherInfo(item.code);
          const Icon = info.icon;
          return (
            <div key={item.time} style={{ flex: '0 0 auto', width: '68px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px', borderRadius: '12px', background: i === 0 ? `rgba(${ACCENT_RGB},0.12)` : 'transparent' }}>
              <span style={{ fontSize: '11px', color: '#9a9a9a', whiteSpace: 'nowrap' }}>{i === 0 ? 'Now' : formatTime(item.time).replace(' ', '\u00A0')}</span>
              <Icon size={20} style={{ color: i === 0 ? ACCENT : '#a8a8a8' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8e8' }}>{Math.round(item.temp)}°</span>
              {item.precipProb > 10 && (
                <span style={{ fontSize: '10px', color: '#7ab8e8' }}>{item.precipProb}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyForecast({ daily }) {
  const maxTemp = Math.max(...daily.temperature_2m_max);
  const minTemp = Math.min(...daily.temperature_2m_min);
  const range = maxTemp - minTemp || 1;

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ fontSize: '11px', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>7-day forecast</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {daily.time.map((t, i) => {
          const info = getWeatherInfo(daily.weather_code[i]);
          const Icon = info.icon;
          const dayMax = daily.temperature_2m_max[i];
          const dayMin = daily.temperature_2m_min[i];
          const barLeft = ((dayMin - minTemp) / range) * 100;
          const barWidth = ((dayMax - dayMin) / range) * 100;
          return (
            <div key={t} style={{ display: 'grid', gridTemplateColumns: '70px 28px 1fr 80px', alignItems: 'center', gap: '12px', padding: '8px 4px' }}>
              <span style={{ fontSize: '13px', color: '#d8d8d8' }}>{formatDayLabel(t, i)}</span>
              <Icon size={18} style={{ color: '#a8a8a8' }} />
              <div style={{ position: 'relative', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'absolute', left: `${barLeft}%`, width: `${barWidth}%`, height: '100%', borderRadius: '2px', background: ACCENT }} />
              </div>
              <span style={{ fontSize: '12.5px', color: '#9a9a9a', textAlign: 'right' }}>
                <span style={{ color: '#e8e8e8' }}>{Math.round(dayMax)}°</span> / {Math.round(dayMin)}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SunInfo({ daily }) {
  const sunrise = daily.sunrise[0];
  const sunset = daily.sunset[0];
  return (
    <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
      <MiniStat icon={Sunrise} label="Sunrise" value={formatTime(sunrise)} />
      <MiniStat icon={Sunset} label="Sunset" value={formatTime(sunset)} />
    </div>
  );
}

function RadarMap({ location }) {
  const [frames, setFrames] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimerRef = useRef(null);

  useEffect(() => {
    window.odiumWeather.radarFrames().then((res) => {
      if (res.ok) {
        const allFrames = [...res.past, ...res.nowcast];
        setFrames({ host: res.host, frames: allFrames });
        setFrameIndex(Math.max(0, res.past.length - 1));
      }
    });
  }, []);

  useEffect(() => {
    if (playing && frames) {
      playTimerRef.current = setInterval(() => {
        setFrameIndex((i) => (i + 1) % frames.frames.length);
      }, 500);
    }
    return () => clearInterval(playTimerRef.current);
  }, [playing, frames]);

  if (!frames || !location) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: '#7a7a7a', fontSize: '12.5px' }}>
        Loading radar...
      </div>
    );
  }

  const currentFrame = frames.frames[frameIndex];
  const tileUrl = currentFrame ? `${frames.host}${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png` : null;
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Radar</span>
        <span style={{ fontSize: '11px', color: '#9a9a9a' }}>{frameTime}</span>
      </div>
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', height: '260px' }}>
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {tileUrl && <TileLayer key={frameIndex} url={tileUrl} opacity={0.75} />}
        </MapContainer>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <button onClick={() => setFrameIndex((i) => Math.max(0, i - 1))} style={radarBtnStyle()}><ChevronLeft size={14} /></button>
        <button onClick={() => setPlaying((p) => !p)} style={radarBtnStyle(true)}>
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button onClick={() => setFrameIndex((i) => Math.min(frames.frames.length - 1, i + 1))} style={radarBtnStyle()}><ChevronRight size={14} /></button>
        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(frameIndex / (frames.frames.length - 1)) * 100}%`, background: ACCENT, borderRadius: '2px' }} />
        </div>
      </div>
    </div>
  );
}

function radarBtnStyle(active) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
    borderRadius: '8px', background: active ? ACCENT : 'rgba(255,255,255,0.05)',
    border: 'none', color: active ? '#fff' : '#c8c8c8', cursor: 'pointer', flexShrink: 0,
  };
}

function App() {
  const [settings, setSettings] = useState(null);
  const [location, setLocation] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const backRef = useRef(null);
  backRef.current = () => {
    if (showSearch && location) { setShowSearch(false); return true; }
    return false;
  };
  useEffect(() => { window.__odiumBack = () => backRef.current(); }, []);

  useEffect(() => {
    (async () => {
      const result = await window.odiumSettings.load();
      setSettings(result.settings);
      if (result.settings.location) {
        setLocation(result.settings.location);
      } else {
        setShowSearch(true);
      }
    })();
  }, []);

  const loadForecast = useCallback(async (loc, units) => {
    setLoadError(null);
    const res = await window.odiumWeather.forecast({ latitude: loc.latitude, longitude: loc.longitude, units });
    if (res.ok) {
      setForecast(res.data);
    } else {
      setLoadError(res.error);
    }
  }, []);

  useEffect(() => {
    if (location && settings) {
      loadForecast(location, settings.units);
      const interval = setInterval(() => loadForecast(location, settings.units), 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [location, settings?.units, loadForecast]);

  const selectLocation = useCallback((loc) => {
    setLocation(loc);
    setShowSearch(false);
    setSettings((prev) => {
      const next = { ...prev, location: loc };
      window.odiumSettings.save(next);
      return next;
    });
  }, []);

  const toggleSaveLocation = useCallback(() => {
    if (!location) return;
    setSettings((prev) => {
      const key = `${location.latitude}-${location.longitude}`;
      const exists = prev.savedLocations.some((l) => `${l.latitude}-${l.longitude}` === key);
      const nextSaved = exists
        ? prev.savedLocations.filter((l) => `${l.latitude}-${l.longitude}` !== key)
        : [...prev.savedLocations, location];
      const next = { ...prev, savedLocations: nextSaved };
      window.odiumSettings.save(next);
      return next;
    });
  }, [location]);

  const removeSavedLocation = useCallback((loc) => {
    setSettings((prev) => {
      const key = `${loc.latitude}-${loc.longitude}`;
      const next = { ...prev, savedLocations: prev.savedLocations.filter((l) => `${l.latitude}-${l.longitude}` !== key) };
      window.odiumSettings.save(next);
      return next;
    });
  }, []);

  const isCurrentSaved = useMemo(() => {
    if (!location || !settings) return false;
    const key = `${location.latitude}-${location.longitude}`;
    return settings.savedLocations.some((l) => `${l.latitude}-${l.longitude}` === key);
  }, [location, settings]);

  if (!settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#7a7a7a', fontFamily: "'Roboto Condensed', sans-serif" }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%', height: '100vh',
        background: 'linear-gradient(165deg, rgba(22,22,22,0.78) 0%, rgba(14,14,14,0.82) 100%)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Roboto Condensed', 'Inter', ui-sans-serif, system-ui, sans-serif",
        color: '#f2f2f2', position: 'relative',
      }}
    >
      <TitleBar onOpenSearch={() => setShowSearch(true)} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadError && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#f0709a', fontSize: '13px' }}>
            Couldn't load forecast: {loadError}
          </div>
        )}

        {!loadError && !forecast && location && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7a7a7a', fontSize: '13px' }}>Loading forecast...</div>
        )}

        {!location && !showSearch && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7a7a7a', fontSize: '13px' }}>No location set.</div>
        )}

        {forecast && location && (
          <>
            <CurrentConditions
              location={location}
              current={forecast.current}
              units={settings.units}
              onOpenSearch={() => setShowSearch(true)}
              isSaved={isCurrentSaved}
              onToggleSave={toggleSaveLocation}
            />
            <HourlyScroller hourly={forecast.hourly} />
            <DailyForecast daily={forecast.daily} />
            <SunInfo daily={forecast.daily} />
            <RadarMap location={location} />
          </>
        )}
      </div>

      {showSearch && (
        <LocationSearch
          onSelect={selectLocation}
          onClose={() => setShowSearch(false)}
          savedLocations={settings.savedLocations}
          onRemoveSaved={removeSavedLocation}
        />
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
