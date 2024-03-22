// require("dotenv").config({ path: "./env" });
import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: "./env",
});

connectDB()
    .then(() => {
        app.on("Error", (err) => {
            console.log("🔴 Error : ", err);
            throw err;
        });

        app.listen(process.env.PORT || 8000, () => {
            console.log(`🌎 Server is Running at port 🟢 ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.log(`🔴 MONGO DB Connection Failed !!! ${error}`);
    });

/*
import express from "express";
const app = express();
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on("Error", (err) => {
            console.log("Error : ", err);
            throw err;
        });
        app.listen(process.env.PORT, () => {
            console.log(`App is Listening on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.log("ERROR :", error);
        throw error;
    }
})();
*/
