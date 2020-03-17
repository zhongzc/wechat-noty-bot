const nodemailer = require('nodemailer');
require('dotenv').config();
const log = require('loglevel');

function sendMail({ subject, text }) {
    if (!process.env.BOT_MAIL_HOST
        || !process.env.BOT_MAIL_USERNAME
        || !process.env.BOT_MAIL_PASSWORD
        || !process.env.BOT_MAIL_FROM
        || !process.env.BOT_MAIL_TO) {
        log.warn(`Email variables are not specified`);
        return;
    }
    
    const transporter = nodemailer.createTransport({
        host: process.env.BOT_MAIL_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.BOT_MAIL_USERNAME,
            pass: process.env.BOT_MAIL_PASSWORD,
        }
    });

    transporter.sendMail({
        from: process.env.BOT_MAIL_FROM,
        to: process.env.BOT_MAIL_TO,
        subject,
        text,
    }, function (error, info) {
        if (error) {
            log.error('Email', error);
        } else {
            log.info('Email sent:' + info.response);
        }
    });
}

module.exports = sendMail;
