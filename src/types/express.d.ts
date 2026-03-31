declare namespace Express {
  interface Request {
    filePaths?: {
      filePath: string;
      extractedPath: string;
    };
    platform: string;
    user?: User;
  }
  interface User {
    id: string;
  }
}
