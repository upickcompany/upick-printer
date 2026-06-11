import Store from 'electron-store';

export interface AppConfig {
  restaurantId: string;
  printerIp: string;
  printerPort: number;
}

export const store = new Store<AppConfig>({
  defaults: {
    restaurantId: '',
    printerIp: '192.168.40.18',
    printerPort: 9100
  }
});
