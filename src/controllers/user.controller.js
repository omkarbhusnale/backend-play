import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinaryService.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // REGISTER USER
    // Get User details from frontend
    const { username, email, password, fullName } = req.body;

    // console.log("Email : ", email, "| Password : ", password,
    //             "| Username : ", username, "| Fullname : ", fullName
    // );

    // Input Validation - Not empty
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, `${field} is must not be Empty`);
    }
    // else {
    //     res.status(200).json({
    //         message: "Response is OK..",
    //     });
    // }

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

    if (!avatarLocalPath) {
        // console.log(req.files?.avatar[0]?.path);

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

export { registerUser };
