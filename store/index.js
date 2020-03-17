const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
var fs = require('fs');

const dbDir = require('os').homedir() + '/.wechat-bot/';
if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir);
}

const adapter = new FileSync(dbDir + 'db.json');
const db = low(adapter);

let store = {
    save: function ({ createTime, args }) {
        db.set(args.name, { createTime, args }).write();
    },
    get: function (name) {
        return db.get(name).value();
    },
    remove: function (name) {
        db.unset(name).write();
    },
    values: function() {
        return db.values();
    }
}

module.exports = store;
