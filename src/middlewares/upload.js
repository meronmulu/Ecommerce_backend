const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = "src/uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  console.log(`📂 Upload attempt: ${file.originalname} (${file.mimetype})`);
  
  const isImageMime = file.mimetype.startsWith("image/");
  const isImageExt = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname);

  if (isImageMime || isImageExt) {
    cb(null, true);
  } else {
    console.error(`❌ Rejected file: ${file.originalname} - ${file.mimetype}`);
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

module.exports = upload;
