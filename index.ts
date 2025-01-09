import express, { Request, Response, NextFunction } from 'express';
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import logger from "./utils/logger";

dotenv.config();

// Middleware to log all incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`[${req.method}] ${req.originalUrl}`);
  next();
});

const port: number = parseInt(process.env.PORT || "4500", 10);

mongoose
  .connect(process.env.MONGODB_URL as string)
  .then(() => {
    console.log("Database connection successful...");
  })
  .catch((err: Error) => {
    console.error("Database connection error:", err.message);
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
