import { app, connectDatabase } from '../server.js';

export default async function handler(req, res) {
  await connectDatabase();
  return app(req, res);
}
