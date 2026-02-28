const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});


/*  GLOBAL MIDDLEWARE */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* LOG ALL REQUESTS (DEBUG) */
app.use((req, res, next) => {
  console.log("INCOMING:", req.method, req.url);
  next();
});

/* ROUTES */
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/timesheet", require("./routes/timesheet.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/holidays", require("./routes/holiday.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/super-admin", require("./routes/super-admin.routes"));





/* TEST ROUTE */
app.get("/", (req, res) => {
  res.send("Timesheet Backend API is running");
});

/* START SERVER */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



