import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const escpos = require('escpos');
const Network = require('escpos-network');
import { store } from './store';

// We need to polyfill some things for escpos if needed, but usually it works fine in Node
// We attach the network adapter to escpos
escpos.Network = Network;

export async function printOrder(orderData: any): Promise<boolean> {
  const printerIp = store.get('printerIp');
  const printerPort = store.get('printerPort') || 9100;
  
  if (!printerIp) {
    console.error('No printer IP configured');
    return false;
  }

  return new Promise((resolve, reject) => {
    try {
      const device = new escpos.Network(printerIp, printerPort);
      const options = { encoding: "GB18030" /* default */ };
      const printer = new escpos.Printer(device, options);

      device.open((error: any) => {
        if (error) {
          console.error('Error connecting to printer:', error);
          reject(error);
          return;
        }

        try {
          // FORMATTING THE RECEIPT
          printer
            .font('a')
            .align('ct')
            .style('b')
            .size(2, 2)
            .text('UPick')
            .size(1, 1)
            .text('Pedido #' + orderData.pickupCode)
            .text('--------------------------------')
            .align('lt')
            .text(`Cliente: ${orderData.student?.firstName || 'Usuario'}`)
            .text(`Fecha: ${new Date(orderData.createdAt).toLocaleString()}`)
            .text('--------------------------------');

          // ITEMS
          if (orderData.items && orderData.items.length > 0) {
            orderData.items.forEach((item: any) => {
              printer.text(`${item.quantity}x ${item.product?.name || 'Producto'}`);
            });
          }

          printer
            .text('--------------------------------')
            .align('ct')
            .text('¡Gracias por usar UPick!')
            .cut()
            .close();
            
          resolve(true);
        } catch (printError) {
          console.error('Error during printing commands:', printError);
          device.close();
          reject(printError);
        }
      });
    } catch (err) {
      console.error('Critical printer error:', err);
      reject(err);
    }
  });
}

export async function testPrinter(ip: string, port: number = 9100): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const device = new escpos.Network(ip, port);
      const printer = new escpos.Printer(device);

      device.open((error: any) => {
        if (error) {
          console.error('Error testing printer connection:', error);
          resolve(false);
          return;
        }

        try {
          printer
            .align('ct')
            .text('Prueba de Conexión Exitosa')
            .text('UPick Printer Agent')
            .cut()
            .close();
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });
    } catch (err) {
      resolve(false);
    }
  });
}
