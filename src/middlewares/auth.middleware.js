import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { User } from "../models/User.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    // Access Token fetch from request as it has cookies which holds tokens
    try {
        const accessToken =
            req.cookies.accessToken ||
            req.header("Authorization")?.replace("Bearer", "");

        if (!accessToken) {
            throw new ApiError(401, "Unauthorized Request");
        }

        // Verify Token with Token Secret
        const decodedToken = await jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );

        // DB request to find user By decodedToken Id without Password and Token
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, `Invalid Access Token Credentials.`);
        }

        // If user available then add it to then req and call next
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});
