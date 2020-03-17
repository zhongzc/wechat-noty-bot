const { Wechaty } = require('wechaty')

let bot = Wechaty.instance()
    .on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}`))
    .on('login', user => console.log(`User ${user} logined`))
    .on('message', './listeners/on-message')
    .on('error', (err) => { console.log('err', err) })
    .start();

module.exports = bot;