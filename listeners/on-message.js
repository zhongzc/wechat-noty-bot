const Moment = require('moment');
const { Wechaty } = require('wechaty');
const store = require('../store/index.js');
const log = require('loglevel');
require('dotenv').config();

const helpMessage = `       ---------- 提醒小助手 ----------
命令：
@所有            
@删除 $名称
@帮助
@添加  #名称 $文字
              #时刻 $时间 
                          默认：${new Date().toLocaleTimeString('en-GB')}
              #日期 $日期 
                          默认：${new Date().toLocaleDateString('zh-Hans-CN')}
              #提醒 $文字 
                          默认：$名称
             [#周期 $时间]
`;

let myMaster = process.env.MASTER_ALIAS;
let myMasterContact = null;
let timeoutHandles = {};
let intervalHandles = {};
let bot = Wechaty.instance();

async function onMessage(message) {
    const from = message.from();

    if (await from.alias() !== myMaster) {
        return;
    }

    if (!message.text()) {
        return;
    }

    log.info(`Get Message: ${message.text()}`);
    switch (message.text().substring(0, 3)) {
        case '@帮助':
            await message.say(helpMessage);
            break;

        case '@添加':
            const err = onHandleAdd(message.text().substring(3));
            if (err) {
                await message.say(`${err}\n\n${helpMessage}`);
                log.info(`Add err: ${err}`);

            } else {
                await message.say('添加成功！');
                log.info(`Add successfully`);
            }
            break;

        case '@所有':
            let res = '提醒列表:\n';
            for (const value of store.values()) {
                res += `名称：${value.args.name}, 创建时间：${value.createTime}\n`;
            }
            res += '-------------';
            await message.say(res);
            break;

        case '@删除':
            const name = message.text().substring(3).trim();
            if (name.length === 0) {
                await message.say('请指定名称');
                log.info('Remove failed due to invalid name');
            } else if (!store.get(name)) {
                await message.say(`${name}不存在`);
                log.info('Remove failed due to emply name');
            } else {
                store.remove(name);
                if (timeoutHandles[name]) {
                    clearTimeout(timeoutHandles[name]);
                    delete timeoutHandles[name];
                }
                if (intervalHandles[name]) {
                    clearTimeout(intervalHandles[name]);
                    delete intervalHandles[name];
                }
                await message.say('删除成功！');
                log.info('Remove successfully');
            }
            break;

        default:
            log.warn(`Can not handle ${message.text()}`);
            break;
    }
}

function init() {
    log.info('Setting up ...')
    for (const value of store.values()) {
        setupTimer(value);
    }
}

async function sendToMaster({ name, msg }) {
    if (!myMasterContact) {
        myMasterContact = await bot.Contact.find({ alias: myMaster });
    }
    log.info(`Notice [${name}] is sending ${msg}`);
    await myMasterContact.say(`${name}说：\n${msg}`);
}

function setupTimer({ createTime, args }) {
    const now = (new Date()).getTime();
    const future = args.date.timestamp + args.time.timeOffset;
    // not possible to run
    if (!args.interval && future <= now) {
        if (timeoutHandles[args.name]) {
            clearTimeout(timeoutHandles[args.name]);
            delete timeoutHandles[args.name];
        }
        log.info(`Notice [${args.name}] is out of time`);
        return;
    }

    log.info(`Notice [${args.name}] is setting up`);
    store.save({ createTime, args })

    if (!args.interval) {
        timeoutHandles[args.name] = setTimeout(async () => {
            await sendToMaster({ name: args.name, msg: args.text });
            store.remove(args.name);
            if (timeoutHandles[args.name]) {
                clearTimeout(timeoutHandles[args.name]);
                delete timeoutHandles[args.name];
            }
        }, future - now);
        log.info(`Notice [${args.name}] will active in ${(future - now) / 1000}s`);
    } else {
        const begin = future > now ? future : (Math.floor((now - future) / args.interval + 1) * args.interval + future);
        timeoutHandles[args.name] = setTimeout(async () => {
            await sendToMaster({ name: args.name, msg: args.text });
            intervalHandles[args.name] = setInterval(async () => {
                await sendToMaster({ name: args.name, msg: args.text });
            }, args.interval);
        }, begin - now);
        log.info(`Notice [${args.name}] will active in ${(begin - now) / 1000}s and ring every ${args.interval / 1000}s`);
    }
}

function onHandleAdd(rawString) {
    const [args, err] = parseAddArg(rawString);
    if (err) {
        return err;
    }
    if (store.get(args.name)) {
        return `${args.name}已存在`;
    }

    setupTimer({
        createTime: Moment().toLocaleString(),
        args,
    })
}

function parseAddArg(rawString) {
    const flags = ["名称", "时刻", "日期", "提醒", "周期"];

    let args = {};
    const rawArgs = rawString.trim().split('#');

    for (arg of rawArgs) {
        arg = arg.trim();

        if (arg.length < 2) {
            continue;
        }

        const flag = arg.substring(0, 2);
        const value = arg.substring(2).trim();

        if (!flags.includes(flag)) {
            return [null, `未能解析"${flag}"`];
        }

        args[flag] = value;
    }

    let argObject = {};
    let err = null;

    for (const [key, value] of Object.entries(args)) {
        switch (key) {
            case '名称':
                [argObject['name'], err] = parseName(value);
                if (err) {
                    return [null, err];
                }
                break;
            case '时刻':
                [argObject['time'], err] = parseTime(value);
                if (err) {
                    return [null, err];
                }
                break;
            case '日期':
                [argObject['date'], err] = parseDate(value);
                if (err) {
                    return [null, err];
                }
                break;
            case '提醒':
                [argObject['text'], err] = parseText(value);
                if (err) {
                    return [null, err];
                }
                break;
            case '周期':
                [argObject['interval'], err] = parseInterval(value);
                if (err) {
                    return [null, err];
                }
                break;
        }
    }

    if (!argObject['name']) {
        return [null, "请指定名称"];
    }
    if (!argObject['time']) {
        [argObject['time'], _] = parseTime(new Date().toLocaleTimeString('en-GB'));
    }
    if (!argObject['date']) {
        [argObject['date'], _] = parseDate(new Date().toLocaleDateString('zh-Hans-CN'));
    }
    if (!argObject['text']) {
        argObject['text'] = argObject['name'];
    }

    return [argObject, null];
}

function parseName(name) {
    if (!name || name.length == 0) {
        return [null, '名称未指定'];
    }
    if (name.includes(' ')) {
        return [null, '名称不得有空格'];
    }
    return [name, null];
}

function parseTime(time) {
    const moment = Moment(time, 'HH:mm:ss');

    if (!moment.isValid()) {
        return [null, '时刻表示不合法，请遵循HH:mm:ss格式'];
    }
    let r = { hour: moment.hour(), minute: moment.minute(), second: moment.second() };
    r.timeOffset = r.hour * 3_600_000 + r.minute * 60_000 + r.second * 1_000;
    return [r, null];
}

function parseDate(date) {
    const moment = Moment(date, "YYYY/MM/DD");
    if (!moment.isValid()) {
        return [null, '日期表示不合法，请遵循YYYY/MM/DD格式'];
    }
    let res = {
        'year': moment.year(),
        'month': moment.month(),
        'date': moment.date(),
        'timestamp': new Date(moment.toDate().toLocaleDateString()).getTime()
    }

    return [res, null];
}

function parseText(text) {
    return [text, null];
}

function parseInterval(interval) {
    const pd = /(\d*\.?\d+)d/.exec(interval);
    const ph = /(\d*\.?\d+)h/.exec(interval);
    const pm = /(\d*\.?\d+)m/.exec(interval);
    const ps = /(\d*\.?\d+)s/.exec(interval);
    const d = pd && pd[1] || '0';
    const h = ph && ph[1] || '0';
    const m = pm && pm[1] || '0';
    const s = ps && ps[1] || '0';
    if (d.length === 0 || h.length === 0 || m.length === 0 || s.length === 0) {
        return [null, '周期表示不合法，请遵循dhms格式'];
    }
    const res = (((parseFloat(d) * 24 + parseFloat(h)) * 60 + parseFloat(m)) * 60 + parseFloat(s)) * 1000;
    return [res, null];
}

module.exports = { onMessage, init };
