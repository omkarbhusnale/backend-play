import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // Claudinary URL
            required: true,
        },
        thumbnail: {
            type: String,
            required: [true, "Thumbnail is Required."], // Claudinary URL
            index: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        title: {
            type: String,
            required: [true, "Title is Required."],
            unique: true,
            lowecase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true,
        },
        duration: {
            type: Number, // From Claudinary
            required: true,
            index: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
            required: true,
        },
    },
    { timestamps: true }
);
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
