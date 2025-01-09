import express, {Request, Response, NextFunction, ErrorRequestHandler} from "express";
import categoryRoutes from "./routes/categoryRoute";
import AppError from "./utils/AppError";
import errorHandler from "./error-handler/applicationError"
import logger from "./utils/logger";
import apiLimiter from "./middleware/rateLimiter";

const app: express.Application = express();

app.use(express.json());

app.use(apiLimiter);

app.use("/api/v1/categories", categoryRoutes);

app.all("*",(req:Request,res:Response,next:NextFunction)=>{
    const errorMessage = `Can't find ${req.originalUrl} on this Server`;
    logger.error(errorMessage); // Log the error
    next(new AppError(`can't find ${req.originalUrl} on this Server`,404));
})

app.use(errorHandler)

export default app;
