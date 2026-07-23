import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const escpos = require('escpos');
const Network = require('escpos-network');
const USB = require('escpos-usb');
import { store } from './store';
import { parseColombianDate } from './timeUtils';

// We need to polyfill some things for escpos if needed, but usually it works fine in Node
// We attach the network and usb adapters to escpos
escpos.Network = Network;
escpos.USB = USB;

export async function printOrder(orderData: any): Promise<boolean> {
  const connectionType = store.get('connectionType') || 'network';
  const printerIp = store.get('printerIp');
  const printerPort = store.get('printerPort') || 9100;
  const printerVid = store.get('printerVid');
  const printerPid = store.get('printerPid');
  
  if (connectionType === 'network' && !printerIp) {
    console.error('No printer IP configured');
    return false;
  }

  return new Promise((resolve, reject) => {
    try {
      let device: any;
      if (connectionType === 'usb') {
        if (printerVid && printerPid) {
          device = new escpos.USB(printerVid, printerPid);
        } else {
          device = new escpos.USB();
        }
      } else {
        device = new escpos.Network(printerIp, printerPort);
        
        // Patch para evitar que la impresora se bloquee en Red
        // Usamos .end() para cerrar la conexión TCP correctamente en lugar de .destroy() brusco
        device.close = function(cb: any) {
          if (this.device) {
            this.device.end(); // Cierre ordenado (envía FIN)
            setTimeout(() => {
              if (this.device) {
                this.device.destroy();
                this.device = null;
              }
              if (cb) cb(null, this.device);
            }, 500); // Dar un poco de tiempo para asegurar que se enviaron los datos
          } else {
            if (cb) cb(null, this.device);
          }
          return this;
        };
      }

      const options = { encoding: "GB18030" /* default */ };
      const printer = new escpos.Printer(device, options);

      device.open((error: any) => {
        if (error) {
          console.error('Error connecting to printer:', error);
          reject(error);
          return;
        }

        try {
          // Opciones de formato de fecha para Colombia
          const dateOptions: Intl.DateTimeFormatOptions = { 
            timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true 
          };
          
          let pickupStr = '';
          if (orderData.pickupSlotStart) {
            const pickupStart = parseColombianDate(orderData.pickupSlotStart)?.toLocaleTimeString('es-CO', dateOptions) || '';
            const pickupEnd = parseColombianDate(orderData.pickupSlotEnd)?.toLocaleTimeString('es-CO', dateOptions) || '';
            pickupStr = `${pickupStart} - ${pickupEnd}`;
          }

          // FORMATTING THE RECEIPT
          printer
            .font('a')
            .align('ct')
            .style('b')
            .size(2, 2)
            .text('UPick')
            .size(1, 1)
            .text('Pedido #' + orderData.pickupCode)
            .text('PAGADO')
            .text('--------------------------------')
            .align('lt')
            .text(`Cliente: ${orderData.student?.firstName || 'Usuario'}`);
            
          if (pickupStr) {
            printer.text(`Recoger: ${pickupStr}`);
          }
          
          printer.text('--------------------------------');

          // ITEMS
          if (orderData.items && orderData.items.length > 0) {
            orderData.items.forEach((item: any) => {
              printer.text(`${item.quantity}x ${item.product?.name || 'Producto'}`);
            });
          }

          printer
            .text('--------------------------------')
            .align('ct')
            .text('Gracias por usar UPick!') // Quitamos el '¡' que causa problemas de codificación
            .feed(3) // Avanzamos 3 líneas para que no corte el texto
            .cut()
            .close((err: any) => {
              if (err) console.error('Error al cerrar la impresora:', err);
              resolve(true);
            });
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

export async function testPrinter(config: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      let device: any;
      if (config.connectionType === 'usb') {
        if (config.vid && config.pid) {
          device = new escpos.USB(config.vid, config.pid);
        } else {
          device = new escpos.USB();
        }
      } else {
        device = new escpos.Network(config.ip, config.port || 9100);
        
        // Patch para el test también
        device.close = function(cb: any) {
          if (this.device) {
            this.device.end();
            setTimeout(() => {
              if (this.device) {
                this.device.destroy();
                this.device = null;
              }
              if (cb) cb(null, this.device);
            }, 500);
          } else {
            if (cb) cb(null, this.device);
          }
          return this;
        };
      }

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
            .close((err: any) => {
              resolve(true);
            });
        } catch (e) {
          resolve(false);
        }
      });
    } catch (err) {
      resolve(false);
    }
  });
}
