import rateLimit from "express-rate-limit";

// rate limit 
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3,
    message:{
        success:false,
        message:"Too many requests from this IP, please try again after 1 minute."
    }
});
export default apiLimiter;