const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

// Sends a 6-digit reset code to the user's email. If SMTP isn't configured
// (no SMTP_HOST env var set), the code is logged to the server console
// instead so the app still works out of the box in dev/local setups.
async function sendResetCodeEmail(toEmail, code) {
  const t = getTransporter();

  if (!t) {
    console.log(`[mailer] SMTP not configured — password reset code for ${toEmail}: ${code}`);
    return { delivered: false };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Your password reset code",
    text: `Your verification code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your verification code is <b style="font-size:20px; letter-spacing:2px;">${code}</b>.</p><p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
  });

  return { delivered: true };
}

module.exports = { sendResetCodeEmail };
