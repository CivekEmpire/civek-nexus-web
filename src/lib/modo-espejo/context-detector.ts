/**
 * CIVEK NEXUS — Context Detection Engine
 * Sprint 17 — Modo Espejo
 */

export interface UserContext {
  location: 'home' | 'office' | 'other' | 'unknown';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  activity: 'working' | 'socializing' | 'resting' | 'traveling' | 'unknown';
  device: 'mobile' | 'desktop';
  isMoving: boolean;
  networkName?: string;
  coordinates?: { latitude: number; longitude: number };
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isWeekend: boolean;
  confidence: number;
}

export class ContextDetector {
  async detectContext(): Promise<UserContext> {
    const location = await this.detectLocation();
    const activity = await this.detectActivity();
    const device = this.detectDevice();
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const dayOfWeek = this.getDayOfWeek(now);
    const isWeekend = dayOfWeek === 'saturday' || dayOfWeek === 'sunday';

    return {
      location,
      timeOfDay,
      activity,
      device,
      isMoving: false,
      dayOfWeek,
      isWeekend,
      confidence: 0.8,
    };
  }

  private async detectLocation(): Promise<UserContext['location']> {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17 ? 'office' : 'home';
  }

  private async detectActivity(): Promise<UserContext['activity']> {
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) return 'working';
    if (hour >= 18 && hour <= 22) return 'socializing';
    return 'resting';
  }

  private detectDevice(): UserContext['device'] {
    return /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  private getTimeOfDay(date: Date): UserContext['timeOfDay'] {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private getDayOfWeek(date: Date): UserContext['dayOfWeek'] {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()] as UserContext['dayOfWeek'];
  }
}

export class CircleSuggester {
  async suggestCircle(): Promise<{
    circle: 'vida' | 'negocios' | 'elite' | 'descanso';
    confidence: number;
    reason: string;
  }> {
    const detector = new ContextDetector();
    const context = await detector.detectContext();

    if (context.timeOfDay === 'night') {
      return { circle: 'descanso', confidence: 0.9, reason: 'Modo Descanso durante la noche' };
    }

    if (context.location === 'office' || context.activity === 'working') {
      return { circle: 'negocios', confidence: 0.9, reason: 'En la oficina trabajando' };
    }

    if (context.isWeekend) {
      return { circle: 'vida', confidence: 0.8, reason: 'Fin de semana' };
    }

    return { circle: 'vida', confidence: 0.7, reason: 'Default' };
  }
}
