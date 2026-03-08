declare namespace Express {
  interface Request {
    filePaths?: {
      filePath: string;
      extractedPath: string;
    };
    platform: string;
  }
}
