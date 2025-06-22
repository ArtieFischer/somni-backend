import { performance } from 'perf_hooks';

export class ProgressTracker {
  private totalItems: number;
  private completedItems: number = 0;
  private startTime: number;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000; // Update every second
  
  constructor(totalItems: number) {
    this.totalItems = totalItems;
    this.startTime = performance.now();
  }

  update(progress: number): void {
    const currentTime = performance.now();
    
    // Only update display if enough time has passed
    if (currentTime - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    
    this.lastUpdateTime = currentTime;
    const percentage = Math.round(progress * 100);
    const elapsed = (currentTime - this.startTime) / 1000; // seconds
    
    // Estimate time remaining
    const rate = progress / elapsed;
    const remaining = rate > 0 ? (1 - progress) / rate : 0;
    
    // Create progress bar
    const barLength = 30;
    const filledLength = Math.round(barLength * progress);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    // Format time
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${Math.round(seconds)}s`;
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    };
    
    // Clear line and write progress
    process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
    process.stdout.write(
      `Progress: [${bar}] ${percentage}% | ` +
      `Elapsed: ${formatTime(elapsed)} | ` +
      `ETA: ${formatTime(remaining)}`
    );
  }

  complete(): void {
    this.update(1);
    console.log('\n✓ Complete!');
  }

  incrementAndUpdate(): void {
    this.completedItems++;
    this.update(this.completedItems / this.totalItems);
  }
}

export class MultiProgressTracker {
  private trackers: Map<string, ProgressTracker> = new Map();
  private activeTracker: string | null = null;
  
  createTracker(name: string, totalItems: number): void {
    this.trackers.set(name, new ProgressTracker(totalItems));
  }
  
  updateTracker(name: string, progress: number): void {
    const tracker = this.trackers.get(name);
    if (!tracker) return;
    
    // If switching trackers, add newline
    if (this.activeTracker && this.activeTracker !== name) {
      console.log();
    }
    
    this.activeTracker = name;
    process.stdout.write(`[${name}] `);
    tracker.update(progress);
  }
  
  completeTracker(name: string): void {
    const tracker = this.trackers.get(name);
    if (!tracker) return;
    
    if (this.activeTracker === name) {
      tracker.complete();
      this.activeTracker = null;
    }
  }
}

export class SpinnerProgress {
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  
  start(message: string = 'Processing'): void {
    this.stop(); // Stop any existing spinner
    
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.spinnerFrames[this.currentFrame]} ${message}`);
      this.currentFrame = (this.currentFrame + 1) % this.spinnerFrames.length;
    }, 80);
  }
  
  update(message: string): void {
    if (this.interval) {
      process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
      process.stdout.write(`${this.spinnerFrames[this.currentFrame]} ${message}`);
    }
  }
  
  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
      
      if (finalMessage) {
        console.log(`✓ ${finalMessage}`);
      }
    }
  }
}