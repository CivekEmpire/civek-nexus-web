/**
 * CIVEK NEXUS — Modo Espejo UI Components
 *
 * React components for Modo Espejo (Mirror Mode).
 * Auto-adapts the app to user's context.
 */

import React, { useState, useEffect } from 'react';
import { getAutoSwitchManager, AutoSwitchSettings, SwitchEvent } from './auto-switch';
import { ContextDetector, UserContext, ContextRule, CircleSuggester } from './context-detector';

/**
 * Modo Espejo Settings Component
 */
export const ModoEspejoSettings: React.FC<{
  onSettingsChange?: (settings: AutoSwitchSettings) => void;
}> = ({ onSettingsChange }) => {
  const manager = getAutoSwitchManager();
  const [settings, setSettings] = useState<AutoSwitchSettings>(manager.getSettings());

  const handleToggle = (key: keyof AutoSwitchSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    manager.updateSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleIntervalChange = (interval: number) => {
    const newSettings = { ...settings, checkInterval: interval };
    setSettings(newSettings);
    manager.updateSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="modo-espejo-settings">
      <div className="settings-header">
        <h3>⚡ Modo Espejo</h3>
        <p>La app se adapta automáticamente a tu contexto</p>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label htmlFor="enabled">Activar Modo Espejo</label>
          <span className="setting-description">
            Cambia automáticamente entre círculos según tu contexto
          </span>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            id="enabled"
            checked={settings.enabled}
            onChange={() => handleToggle('enabled')}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {settings.enabled && (
        <>
          <div className="setting-item">
            <div className="setting-info">
              <label htmlFor="requireConfirmation">Pedir confirmación</label>
              <span className="setting-description">
                Mostrar notificación antes de cambiar de círculo
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="requireConfirmation"
                checked={settings.requireConfirmation}
                onChange={() => handleToggle('requireConfirmation')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label htmlFor="checkInterval">Intervalo de verificación</label>
              <span className="setting-description">
                Cada cuánto verificar el contexto
              </span>
            </div>
            <select
              id="checkInterval"
              value={settings.checkInterval}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
            >
              <option value={1}>1 minuto</option>
              <option value={5}>5 minutos</option>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label htmlFor="minConfidence">Confianza mínima</label>
              <span className="setting-description">
                Nivel de certeza requerido para cambiar (0-100%)
              </span>
            </div>
            <input
              type="range"
              id="minConfidence"
              min="0"
              max="1"
              step="0.1"
              value={settings.minConfidence}
              onChange={(e) => {
                const newSettings = { ...settings, minConfidence: Number(e.target.value) };
                setSettings(newSettings);
                manager.updateSettings(newSettings);
                onSettingsChange?.(newSettings);
              }}
            />
            <span className="confidence-value">
              {Math.round(settings.minConfidence * 100)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Current Context Display
 */
export const CurrentContextDisplay: React.FC = () => {
  const [context, setContext] = useState<UserContext | null>(null);
  const [suggestion, setSuggestion] = useState<{
    circle: string;
    confidence: number;
    reason: string;
  } | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      const detector = new ContextDetector();
      const suggester = new CircleSuggester();

      const ctx = await detector.detectContext();
      const sug = await suggester.suggestCircle();

      setContext(ctx);
      setSuggestion(sug);
    };

    fetchContext();

    // Refresh every minute
    const interval = setInterval(fetchContext, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!context) {
    return <div className="context-loading">Detectando contexto...</div>;
  }

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'home': return '🏠';
      case 'office': return '🏢';
      case 'other': return '📍';
      default: return '❓';
    }
  };

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'working': return '💼';
      case 'socializing': return '🎉';
      case 'resting': return '😴';
      case 'traveling': return '🚗';
      default: return '🤷';
    }
  };

  return (
    <div className="current-context">
      <h4>Contexto Actual</h4>

      <div className="context-grid">
        <div className="context-item">
          <span className="context-icon">{getLocationIcon(context.location)}</span>
          <div>
            <div className="context-label">Ubicación</div>
            <div className="context-value">{context.location}</div>
          </div>
        </div>

        <div className="context-item">
          <span className="context-icon">{getActivityIcon(context.activity)}</span>
          <div>
            <div className="context-label">Actividad</div>
            <div className="context-value">{context.activity}</div>
          </div>
        </div>

        <div className="context-item">
          <span className="context-icon">⏰</span>
          <div>
            <div className="context-label">Momento</div>
            <div className="context-value">{context.timeOfDay}</div>
          </div>
        </div>

        <div className="context-item">
          <span className="context-icon">📱</span>
          <div>
            <div className="context-label">Dispositivo</div>
            <div className="context-value">{context.device}</div>
          </div>
        </div>
      </div>

      {suggestion && (
        <div className="context-suggestion">
          <div className="suggestion-header">
            <span>Círculo sugerido:</span>
            <strong>{suggestion.circle}</strong>
          </div>
          <div className="suggestion-reason">{suggestion.reason}</div>
          <div className="suggestion-confidence">
            Confianza: {Math.round(suggestion.confidence * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Switch History Component
 */
export const SwitchHistory: React.FC<{
  limit?: number;
}> = ({ limit = 10 }) => {
  const manager = getAutoSwitchManager();
  const [history, setHistory] = useState<SwitchEvent[]>(manager.getHistory(limit));

  useEffect(() => {
    // Subscribe to new switches
    const unsubscribe = manager.onSwitch((event) => {
      setHistory(manager.getHistory(limit));
    });

    return unsubscribe;
  }, [limit]);

  return (
    <div className="switch-history">
      <h4>Historial de Cambios</h4>

      {history.length === 0 ? (
        <p className="empty-history">No hay cambios recientes</p>
      ) : (
        <div className="history-list">
          {history.reverse().map((event, idx) => (
            <div key={idx} className="history-item">
              <div className="history-timestamp">
                {new Date(event.timestamp).toLocaleString()}
              </div>
              <div className="history-switch">
                <span className="from-circle">{event.from}</span>
                <span className="arrow">→</span>
                <span className="to-circle">{event.to}</span>
              </div>
              <div className="history-reason">{event.reason}</div>
              {event.confirmed && (
                <div className="history-badge">Confirmado</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Statistics Component
 */
export const ModoEspejoStats: React.FC = () => {
  const manager = getAutoSwitchManager();
  const stats = manager.getStatistics();

  return (
    <div className="modo-espejo-stats">
      <h4>Estadísticas</h4>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.totalSwitches}</div>
          <div className="stat-label">Total de cambios</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{stats.autoSwitches}</div>
          <div className="stat-label">Automáticos</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{stats.manualSwitches}</div>
          <div className="stat-label">Manuales</div>
        </div>

        <div className="stat-item">
          <div className="stat-value">{Math.round(stats.avgConfidence * 100)}%</div>
          <div className="stat-label">Confianza promedio</div>
        </div>
      </div>

      <div className="stats-by-circle">
        <h5>Por círculo</h5>
        {Object.entries(stats.byCircle).map(([circle, count]) => (
          <div key={circle} className="circle-stat">
            <span className="circle-name">{circle}</span>
            <div className="circle-bar">
              <div
                className="circle-bar-fill"
                style={{
                  width: `${(count / stats.totalSwitches) * 100}%`,
                }}
              ></div>
            </div>
            <span className="circle-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Modo Descanso Toggle
 */
export const ModoDescansoToggle: React.FC<{
  active: boolean;
  onToggle: (active: boolean) => void;
}> = ({ active, onToggle }) => {
  return (
    <button
      className={`modo-descanso-toggle ${active ? 'active' : ''}`}
      onClick={() => onToggle(!active)}
    >
      <span className="toggle-icon">{active ? '😴' : '⚡'}</span>
      <span className="toggle-label">
        {active ? 'Modo Descanso' : 'Activar Modo Descanso'}
      </span>
    </button>
  );
};

/**
 * Learn Location Component
 */
export const LearnLocationButton: React.FC<{
  type: 'home' | 'office' | 'other';
  name?: string;
}> = ({ type, name }) => {
  const [learned, setLearned] = useState(false);

  const handleLearn = async () => {
    const detector = new ContextDetector();
    await detector.learnLocation(type, name);
    setLearned(true);

    setTimeout(() => setLearned(false), 3000);
  };

  return (
    <button
      className="learn-location-button"
      onClick={handleLearn}
      disabled={learned}
    >
      {learned ? '✓ Aprendido' : `Enseñar: Estoy en ${type}`}
    </button>
  );
};

/**
 * Full Modo Espejo Dashboard
 */
export const ModoEspejoDashboard: React.FC = () => {
  return (
    <div className="modo-espejo-dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <ModoEspejoSettings />
        </div>

        <div className="dashboard-section">
          <CurrentContextDisplay />
        </div>

        <div className="dashboard-section">
          <SwitchHistory limit={5} />
        </div>

        <div className="dashboard-section">
          <ModoEspejoStats />
        </div>

        <div className="dashboard-section learn-section">
          <h4>Enseñar Ubicaciones</h4>
          <div className="learn-buttons">
            <LearnLocationButton type="home" name="Casa" />
            <LearnLocationButton type="office" name="Oficina" />
          </div>
        </div>
      </div>
    </div>
  );
};
