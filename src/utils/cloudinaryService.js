import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return;
        // Upload File to Cloudinary
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        console.log(`File Uploaded Successfully. ${res.url}`); // File Has been Uploaded Successfully
        return res;
    } catch (error) {
        fs.unlinkSync(localFilePath); // Remove the locally saved Temp file as the upload op got failed.
        return null;
    }
};

// cloudinary.uploader.upload(
//     "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//     { public_id: "olympic_flag" },
//     function (error, result) {
//         console.log(result);
//     }
// );

export { uploadOnCloudinary };
