import serverless from 'serverless-http';
import { startServer } from './entry.mjs';

let serverPromise;

export const handler = async (event, context) => {
  if (!serverPromise) {
    serverPromise = startServer();
  }
  
  const server = await serverPromise;
  const serverlessHandler = serverless(server);
  
  return serverlessHandler(event, context);
};
