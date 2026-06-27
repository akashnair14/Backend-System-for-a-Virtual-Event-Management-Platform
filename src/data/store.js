const users = [];
const events = [];

const clearStore = () => {
  users.length = 0;
  events.length = 0;
};

module.exports = {
  users,
  events,
  clearStore
};
