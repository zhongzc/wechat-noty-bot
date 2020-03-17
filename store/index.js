let store = {
    notifications: {},
    save: function ({ createTime, args }) {
        this.notifications[args.name] = {
            createTime,
            args,
        }
    },
    get: function (name) {
        return this.notifications[name];
    },
    remove: function (name) {
        delete this.notifications[name];
    },
    values: function() {
        return Object.values(this.notifications);
    }
}

module.exports = store;
