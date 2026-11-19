import 'dotenv/config';

import app from './app.js';
import connectDB from './config/db.js';
import messages from './constants/messages.js';

async function startServer() {
  try {
    if (process.env.PRICE_SOURCE === 'mock') {
      try {
        await connectDB();
      } catch (error) {
        console.warn(messages.log.ALERTS_DISABLED(error.message));
      }
    } else {
      await connectDB();
    }

    const port = process.env.PORT || 5000;
    const server = app.listen(port, process.env.HOST || undefined, () => {
      console.log(messages.log.SERVER_RUNNING(port));
    });

    server.on('error', (error) => {
      console.error(messages.log.SERVER_START_FAILED, error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error(messages.log.STARTUP_FAILED, error.message);
    process.exit(1);
  }
}

startServer();
