import 'dotenv/config';

import app from './app.js';
import connectDB from './config/db.js';

async function startServer() {
  try {
    if (process.env.PRICE_SOURCE === 'mock') {
      try {
        await connectDB();
      } catch (error) {
        console.warn(`MongoDB unavailable; persistent alerts disabled: ${error.message}`);
      }
    } else {
      await connectDB();
    }

    const port = process.env.PORT || 5000;
    const server = app.listen(port, () => {
      console.log(`Crystal Bullion server running on port ${port}`);
    });

    server.on('error', (error) => {
      console.error('Server failed to start:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
