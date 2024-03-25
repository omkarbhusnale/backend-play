import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ limit: "20kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// ROUTES IMPORT
import userRouter from "./routes/user.routes.js";

// ROUTER DECLARATION
app.use("/api/v1/users", userRouter); // http://localhost:8000/api/v1/users

export { app };
