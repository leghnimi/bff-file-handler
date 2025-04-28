import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { StatusCodes } from 'http-status-codes';

const uploadDir = config.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype === 'text/csv') {
    cb(null, true);
  } else {
    const error: any = new Error('Invalid file type. Only CSV files are allowed.');
    error.statusCode = StatusCodes.BAD_REQUEST;
    cb(error);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.maxFileSizeInBytes,
  },
  fileFilter: fileFilter,
});

export const handleMulterError = (err: any, req: Request, res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(StatusCodes.REQUEST_TOO_LONG).json({
        message: `File too large. Maximum size allowed is ${config.maxFileSizeInBytes / 1024 / 1024}MB.`,
      });
    }
    return res.status(StatusCodes.BAD_REQUEST).json({ message: `Multer error: ${err.message}` });
  } else if (err) {
    return res.status(err.statusCode || StatusCodes.BAD_REQUEST).json({ message: err.message });
  }
  next();
};
