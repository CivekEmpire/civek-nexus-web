# CIVEK NEXUS — Modo Espejo

**Sprint 17 — Adaptación automática según contexto.**

## Concepto

Modo Espejo detecta tu ubicación, hora, actividad y cambia automáticamente entre círculos (Vida, Negocios, Élite, Descanso).

## Features

### Context Detection
- **Ubicación:** Home, Office, Other
- **Hora:** Morning, Afternoon, Evening, Night  
- **Actividad:** Working, Socializing, Resting, Traveling
- **Dispositivo:** Mobile, Desktop
- **Día:** Weekday, Weekend

### Auto-Switch Rules
1. **Modo Descanso (22h-6h)** → Prioridad 100
2. **Oficina (9am-5pm)** → Negocios (Prioridad 90)
3. **Trabajando** → Negocios (Prioridad 80)
4. **Fin de semana** → Vida (Prioridad 70)
5. **Casa noche** → Vida (Prioridad 60)

### UI Adaptation
- **Vida:** Colores cálidos (naranja, verde)
- **Negocios:** Profesional (azul, gris)
- **Élite:** Premium (dorado, negro)
- **Descanso:** Oscuro + minimal

## API

```typescript
import { ContextDetector, CircleSuggester, AutoSwitchManager } from './modo-espejo';

// Detect context
const detector = new ContextDetector();
const context = await detector.detectContext();

// Get suggestion
const suggester = new CircleSuggester();
const suggestion = await suggester.suggestCircle();

// Auto-switch
const manager = new AutoSwitchManager({ enabled: true });
manager.onSwitch((event) => {
  console.log('Switched:', event.from, '→', event.to);
});
```

**CIVEK OS PRIMERO — SIEMPRE.**  
**La app que se adapta a ti.** ⚡
