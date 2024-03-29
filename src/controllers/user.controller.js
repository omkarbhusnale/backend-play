import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinaryService.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
    // REGISTER USER
    // Get User details from frontend
    const { username, email, password, fullName } = req.body;

    // Input Validation - Not empty
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, `${field} is must not be Empty`);
    }

    // Check if user already exist : username / Email
    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    // console.log(req.body);
    if (existedUser) {
        throw new ApiError(409, "User with email or username already Exists");
    }

    // Check for images and avatar
    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const converImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log(req.files?.avatar[0]?.path);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    let converImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        converImageLocalPath = req.files.coverImage[0].path;
    }

    // If available upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(converImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is upload faild");
    }

    // Create User Object - Create entry to DB
    const userObject = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email: email,
        username: username.toLowerCase(),
        password,
    });

    // console.log(userObject);

    // Remove Password and RefreshToken from Response
    const createdUser = await User.findById(userObject._id).select(
        "-password -refreshToken"
    );

    // Check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }
    // console.log(createdUser);

    // console.log(
    //     new ApiResponse(200, createdUser, "User registered Successfully")
    // );

    // If true then return response.
    return await res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // LOGIN USER

    // TODOs
    // Fetch Data from request body
    const { email, username, password } = req.body;

    // Validate Req body data - Is empty or not
    // if ([username, password].some((field) => field.trim() === "")) {
    //     throw new ApiError(400, `${field} is must not be Empty`);
    // }
    // Check if either username or email available
    if (!username && !email) {
        throw new ApiError(400, `Username or Email is required`);
    }

    // If not empty then check if user registerd in database with same username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    // check if user available
    if (!existedUser) {
        throw new ApiError(404, `User not available`);
    }

    // Check password is correct for that User
    const userPassword = await existedUser.isPasswordCorrect(password);

    // Validate Password
    if (!userPassword) {
        throw new ApiError(401, `Invalid User Credentials.`);
    }

    // Access Token and Refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        existedUser._id
    );

    // create loggedInUser without aceess of refresh token and Password
    const loggedInUser = await User.findById(existedUser._id).select(
        "-password -refreshToken"
    );

    // send cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // Return response status
    return await res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { loggedInUser, refreshToken, accessToken },
                "User Logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // Find User - By Id
    const loggedOutUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    // send cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // Return Response Result with Cookie Clear
    return await res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"));
});

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        // console.log(user);
        const accessToken = user.generateAccessToken();
        // console.log(accessToken);
        const refreshToken = user.generateRefreshToken();
        // console.log(refreshToken);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token"
        );
    }
};

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    console.log(req.cookies.refreshToken);
    console.log(incomingRefreshToken);

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request.");
    }

    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        // console.log(decodedToken);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token expired or in use.");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return await res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { refreshToken: newRefreshToken, accessToken },
                    "Access Token Refreshed Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, "Unauthorized Access");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!(newPassword === confirmPassword)) {
        throw new ApiError(
            400,
            "New Password is not matching Confirm Password"
        );
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password");
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200, req.user, "New user fetched Successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if ([fullName, email].some((field) => field.trim() === "")) {
        throw new ApiError(
            400,
            `${field} is must not be Empty, All Fields are Required`
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account Details Updated Successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File Path is Missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading Avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Ccover Image File Path is Missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading Cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image Updated Successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
};
