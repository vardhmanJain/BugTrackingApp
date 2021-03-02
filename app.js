//dependencies
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const User = require("./models/user");
const Bug = require("./models/bug");
const Team = require("./models/team");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const AppError = require("./utils/AppError");
const catchAsync = require("./utils/catchAsync");
const joi = require("joi");
//database
mongoose
  .connect("mongodb://localhost/BugTrackerApplication", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("database connected"))
  .catch(console.log);
//middleware
const validateBug = (req, res, next) => {
  const bugSchema = joi.object({
    title: joi.string().required(),
    description: joi.string().required(),
    status: joi.string(),
    reportedon: joi.date(),
    statuslastmodified: joi.date(),
  });
  const { error } = bugSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new AppError(msg, 400);
  } else {
    next();
  }
};
const validateUser = (req, res, next) => {
  const userSchema = joi.object({
    email: joi.string().required(),
    password: joi.string().required(),
  });
  const { error } = userSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new AppError(msg, 400);
  } else {
    next();
  }
};
const validateTeam = (req, res, next) => {
  const teamSchema = joi.object({
    username: joi.string().required(),
    password: joi.string().required(),
  });
  const { error } = teamSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new AppError(msg, 400);
  } else {
    next();
  }
};
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "vardhman",
    resave: false,
    saveUninitialized: true,
  })
);
//user routes
app.get("/", (req, res) => {
  res.render("index");
});
app.post(
  "/login",
  validateUser,
  catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email, password: password });
    if (user) {
      req.session.sessionId = user._id;
      req.session.usertype = "user";
      res.redirect("/user");
    } else {
      res.redirect("/");
    }
  })
);
app.get(
  "/user/new",
  catchAsync(async (req, res) => {
    res.render("./user/new");
  })
);
app.post(
  "/user",
  validateUser,
  catchAsync(async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.redirect(`/`);
  })
);
app.get(
  "/user",
  catchAsync(async (req, res) => {
    if ((req.session.usertype = "user" && req.session.sessionId)) {
      const id = req.session.sessionId;
      const user = await User.findById(id).populate("bugsreported", [
        "title",
        "reportedon",
      ]);
      res.render("./user/index", { user });
    } else {
      res.redirect("/");
    }
  })
);
//bug routes
app.get("/user/:id/bug/new", (req, res) => {
  const userid = req.params.id;
  res.render("./bug/new", { userid });
});
app.post(
  "/user/:id/bug",
  validateBug,
  catchAsync(async (req, res, next) => {
    const bug = new Bug(req.body);
    const id = req.params.id;
    const user = await User.findById(id);
    user.bugsreported.push(bug);
    bug.reportedby = user;
    await user.save();
    await bug.save();
    res.redirect(`/user`);
  })
);
app.get(
  "/user/:id/bug/:bugid",
  catchAsync(async (req, res, next) => {
    const bugid = req.params.bugid;
    const bug = await Bug.findById(bugid);
    if (!bug) {
      throw new AppError("kya kar raha hai lawde", 404);
    }
    res.render("./bug/show", { bug });
  })
);
//teams and admin routes
app.get("/authority", (req, res) => {
  res.render("authoritylogin.ejs");
});
app.post(
  "/authority",
  catchAsync(async (req, res) => {
    const { username, password, usertype } = req.body;
    if (
      usertype === "admin" &&
      username === "admin@gmail.com" &&
      password === "admin123"
    ) {
      res.redirect("/admin");
    } else {
      const team = await Team.findOne({
        username: username,
        password: password,
      });
      if (team) {
        req.session.sessionId = team._id;
        req.session.usertype = "team";
        res.redirect(`/team`);
      } else {
        res.redirect("/authority");
      }
    }
  })
);
app.get(
  "/admin",
  catchAsync(async (req, res) => {
    const latest = await Bug.find({ status: "new" });
    const assigned = await Bug.find({
      status: "assigned",
    }).populate("assignedto", ["username"]);
    const open = await Bug.find({ status: "open" });
    const fixed = await Bug.find({ status: "fixed" });
    res.render("./admin/index", { latest, assigned, open, fixed });
  })
);
app.get(
  "/admin/bug/:id",
  catchAsync(async (req, res) => {
    const id = req.params.id;
    const bug = await Bug.findById(id).populate("assignedto", "username");
    const teams = await Team.find({}, "username");
    res.render("./admin/bug/show", { bug, teams });
  })
);

app.put(
  "/admin/bug/:id",

  catchAsync(async (req, res) => {
    const id = req.params.id;
    const { action, assignedto } = req.body;
    if (action === "reject") {
      await Bug.findByIdAndUpdate(id, {
        status: "rejected",
        statuslastmodified: Date.now(),
      });
      res.redirect(`/admin`);
    } else {
      const team = await Team.findById(assignedto);
      const bug = await Bug.findById(id);
      bug.status = "assigned";
      bug.assignedto = team;
      bug.statuslastmodified = Date.now();
      team.bugsassigned.push(bug);
      await bug.save();
      await team.save();
      res.redirect(`/admin/bug/${id}`);
    }
  })
);
app.get("/admin/team/new", (req, res) => {
  res.render("./admin/team/new");
});
app.post(
  "/admin/team",
  validateTeam,
  catchAsync(async (req, res) => {
    const team = new Team(req.body);
    team.save();
    res.redirect("/admin");
  })
);
//team routes
app.get(
  "/team",
  catchAsync(async (req, res) => {
    if (req.session.usertype === "team" && req.session.sessionId) {
      const team = await Team.findById(
        req.session.sessionId
      ).populate("bugsassigned", ["title", "status", "statuslastmodified"]);
      res.render("./team/index", { team });
    }
  })
);
app.get(
  "/team/:id/bug/:bugid",
  catchAsync(async (req, res) => {
    const bug = await Bug.findById(req.params.bugid).populate("assignedto", [
      "username",
    ]);
    res.render("./team/bug/show", { bug });
  })
);
app.put(
  "/team/bug/:id",
  catchAsync(async (req, res) => {
    const { status } = req.body;
    const bug = await Bug.findById(req.params.id).populate("assignedto", [
      "_id",
    ]);
    bug.status = status;
    bug.statuslastmodified = Date.now();
    await bug.save();
    res.redirect(`/team/${bug.assignedto._id}/bug/${bug._id}`);
  })
);
app.all("*", (req, res, next) => {
  next(new AppError("page not found"), 404);
});
app.use((err, req, res, next) => {
  const { status = 500, message = "something went wrong" } = err;
  res.status(status).render("error", { err });
});
app.listen(3000, () => {
  console.log("server started");
});
