const { Wechaty } = require('wechaty')
const log = require('loglevel');
const prefix = require('loglevel-plugin-prefix');
const { init, onMessage } = require('./listeners/on-message.js');
const sendMail = require('./mail/index.js');

prefix.reg(log);
prefix.apply(log, { template: '[%t] %l:' });
log.enableAll();

Wechaty.instance()
    .on('scan', (qrcode, status) => {
        if (status === 1) {
            const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}`;
            log.info(`Scan QR Code: ${url}`);
            sendMail({ subject: 'Scan QR Code to (re-)login', text: url });
        }
    })
    .on('login', user => {
        log.info(`User ${user} logined`);
        sendMail({ subject: 'Bot is login successfully', text: 'Enjoy!' });
        init();
    })
    .on('logout', (user, reason) => {
        log.warn(`User ${user} logout`);
        sendMail({ subject: 'Bot is logout unexpectedly', text: `Reason: ${reason}` });
    })
    .on('message', onMessage)
    .on('error', (err) => {
        log.error('err', err);
        sendMail({ subject: 'Bot encounter an error', text: `${err}` });
    })
    .start();