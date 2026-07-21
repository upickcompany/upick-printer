import Store from 'electron-store';

export interface AppConfig {
  restaurantId: string;
  printerIp: string;
  printerPort: number;
  connectionType?: string;
  printerVid?: string;
  printerPid?: string;
  printAdvanceMinutes?: number;
}

export const store = new Store<AppConfig>({
  defaults: {
    restaurantId: '',
    printerIp: '192.168.40.18',
    printerPort: 9100,
    printAdvanceMinutes: 0
  }
});
