const sentEmails = [];

const sendEmail = async (to, subject, text) => {
  const email = { to, subject, text, sentAt: new Date() };
  sentEmails.push(email);

  if (process.env.NODE_ENV === 'test') {
    return { success: true, email };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[Email] Sent to: ${to} | Subject: ${subject}`);
      resolve({ success: true, email });
    }, 50);
  });
};

const clearSentEmails = () => {
  sentEmails.length = 0;
};

module.exports = {
  sendEmail,
  sentEmails,
  clearSentEmails
};
