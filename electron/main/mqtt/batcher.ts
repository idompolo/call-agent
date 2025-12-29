import { BrowserWindow } from 'electron';

interface BatchItem<T> {
  channel: string;
  data: T[];
}

/**
 * MessageBatcher - 고빈도 MQTT 메시지를 배칭하여 IPC 오버헤드 감소
 *
 * GPS 좌표 데이터처럼 초당 수백~수천 개 메시지가 들어올 때
 * 개별 전송 대신 일정 시간 단위로 묶어서 전송하여 성능 최적화
 */
export class MessageBatcher {
  private batches: Map<string, unknown[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private mainWindow: BrowserWindow | null = null;

  constructor(private batchIntervalMs: number = 200) {}

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 메시지를 배치에 추가
   * @param channel IPC 채널명
   * @param data 추가할 데이터
   */
  add<T>(channel: string, data: T): void {
    if (!this.batches.has(channel)) {
      this.batches.set(channel, []);
    }

    const batch = this.batches.get(channel)!;
    batch.push(data);

    // 타이머가 없으면 새로 시작
    if (!this.timers.has(channel)) {
      const timer = setTimeout(() => {
        this.flush(channel);
      }, this.batchIntervalMs);
      this.timers.set(channel, timer);
    }
  }

  /**
   * 특정 채널의 배치를 즉시 전송
   */
  flush(channel: string): void {
    const batch = this.batches.get(channel);
    const timer = this.timers.get(channel);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(channel);
    }

    if (batch && batch.length > 0 && this.mainWindow) {
      // 배치 데이터를 Renderer로 전송
      console.log(`[Batcher] Sending ${batch.length} items to ${channel}`);
      this.mainWindow.webContents.send(channel, batch);
      this.batches.set(channel, []);
    } else if (batch && batch.length > 0 && !this.mainWindow) {
      console.warn('[Batcher] No mainWindow set, cannot send batch');
    }
  }

  /**
   * 모든 채널의 배치를 즉시 전송
   */
  flushAll(): void {
    for (const channel of this.batches.keys()) {
      this.flush(channel);
    }
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.batches.clear();
    this.mainWindow = null;
  }
}

export default MessageBatcher;
