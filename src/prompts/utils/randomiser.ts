import type { InterpreterType } from '../../types';

type HistoryMap = Record<InterpreterType, string[]>;

export class PromptRandomiser {
  private static history: HistoryMap = { jung: [], freud: [], mary: [], lakshmi: [] };
  private static MAX_HISTORY = 5;        // remember last 5 choices per interpreter

  /** deterministic hash-seed */
  static seed(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  /**
   * Pick an item that hasn't been used in the last MAX_HISTORY runs.
   * Falls back to first item if everything was used.
   */
  static pickUnique<T>(list: T[], _text: string, key: InterpreterType): T {
    if (list.length === 0) {
      throw new Error('Cannot pick from empty list');
    }
  
    // Use true randomization instead of deterministic seed
    const idx = Math.floor(Math.random() * list.length);
    const rotated = [...list.slice(idx), ...list.slice(0, idx)];
    const recent = new Set(this.history[key]);
    const choice = rotated.find(x => !recent.has(String(x)));
    
    const finalChoice = choice !== undefined ? choice : list[0]!;
  
    // update history
    this.history[key].unshift(String(finalChoice));
    this.history[key] = this.history[key].slice(0, this.MAX_HISTORY);
    return finalChoice;
  }
} 