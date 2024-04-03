import mongoose, { Schema } from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

export const Tweet = mongoose.model("Tweet", tweetSchema);
