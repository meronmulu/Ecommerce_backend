const express = require("express");
const {createUser,loginUser,getAllUsers,getUserById,updateUser,deleteUser,} = require("../controller/user.controller");

const {authenticateUser,authorizeRoles,} = require("../middlewares/authMiddleware");

const router = express.Router();

// 🔐 AUTH
router.post("/register", createUser);
router.post("/login", loginUser);

// 👤 USERS (ADMIN only)
router.get("/",authenticateUser,authorizeRoles("ADMIN"),getAllUsers);

router.get("/:id",authenticateUser,authorizeRoles("ADMIN"),getUserById);

router.put("/:id",authenticateUser,authorizeRoles("ADMIN"),updateUser);

router.delete("/:id",deleteUser);

module.exports = router;
