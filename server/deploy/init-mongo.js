// Executed by mongosh on the first startup with an empty MongoDB volume.
db.getSiblingDB('crystal_bullion').createUser({
  user: 'crystal_app',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'crystal_bullion' }],
});
