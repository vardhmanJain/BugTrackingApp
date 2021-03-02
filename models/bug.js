const mongoose = require("mongoose");

const bugSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["new", "assigned", "open", "fixed", "rejected"],
    default: "new",
  },
  reportedby: { type: mongoose.Schema.Types.ObjectId, required: true },
  reportedon: { type: Date, default: Date.now() },
  statuslastmodified: { type: Date, default: Date.now(), required: true },
  assignedto: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
});

module.exports = mongoose.model("Bug", bugSchema);
