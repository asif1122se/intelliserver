var express = require("express");
var router = express.Router();


router.get("/chat", (req, res) => {
  res.render("chat");
});

router.get("/home", (req, res) => {
  console.log("home call")
  res.render("home");
});

module.exports = router;