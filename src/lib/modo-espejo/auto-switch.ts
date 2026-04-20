/**
 * CIVEK NEXUS — Auto-Switch Logic
 * Sprint 17 — Modo Espejo
 */

import { CircleSuggester, UserContext } from './context-detector';

export interface AutoSwitchSettings {
  enabled: boolean;
  checkInterval: number;
  requireConfirmation: boolean;
  minConfidence: number;
}

export interface SwitchEvent {
  timestamp: Date;
  from: string;
  to: string;
  reason: string;
  context: UserContext;
  confirmed: boolean;
}

export class AutoSwitchManager {
  private suggester = new CircleSuggester();
  private settings: AutoSwitchSettings;
  private currentCircle: string = 'vida';
  private history: SwitchEvent[] = [];
  private listeners: Array<(event: SwitchEvent) => void> = [];

  constructor(settings?: Partial<AutoSwitchSettings>) {
    this.settings = {
      enabled: settings?.enabled ?? false,
      checkInterval: settings?.checkInterval ?? 5,
      requireConfirmation: settings?.requireConfirmation ?? true,
      minConfidence: settings?.minConfidence ?? 0.7,
    };
  }

  async checkAndSwitch(): Promise<void> {
    const suggestion = await this.suggester.suggestCircle();

    if (suggestion.circle !== this.currentCircle && suggestion.confidence >= this.settings.minConfidence) {
      await this.performSwitch(suggestion.circle, suggestion.reason, {} as UserContext, false);
    }
  }

  private async performSwitch(toCircle: string, reason: string, context: UserContext, confirmed: boolean): Promise<void> {
    const event: SwitchEvent = {
      timestamp: new Date(),
      from: this.currentCircle,
      to: toCircle,
      reason,
      context,
      confirmed,
    };

    this.currentCircle = toCircle;
    this.history.push(event);
    this.listeners.forEach(listener => listener(event));
  }

  onSwitch(listener: (event: SwitchEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  getCurrentCircle(): string {
    return this.currentCircle;
  }

  getHistory(): SwitchEvent[] {
    return this.history;
  }
}
