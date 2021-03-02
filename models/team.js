const mongoose = require("mongoose");

const teamSchema = mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  bugsassigned: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bug" }],
});
module.exports = new mongoose.model("Team", teamSchema);
