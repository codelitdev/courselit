const nodemailer = require("nodemailer");
const {
  mailHost,
  mailUser,
  mailPass,
  mailFrom,
  mailPort,
} = require("../config/constants.js");
const { error } = require("./logger.js");

exports.send = async ({ to, subject, body }) => {
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  });

  try {
    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      html: body,
    });
  } catch (err) {
    await error("Error sending email", err.stack);
  }
};
