// const mongoose = require("mongoose");
// require("dotenv").config(); 

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log("MongoDB Connected Successfully!");
//   } catch (err) {
//     console.error("MongoDB Connection Error:", err);
//     process.exit(1); 
//   }
// };

// module.exports = connectDB;

const mongoose = require("mongoose");
require("dotenv").config();
const connectDB = async () => {
  try {
    // Prevent multiple connections
    if (mongoose.connection.readyState >= 1) {
      console.log("MongoDB already connected.");
      return;
    }
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });
    console.log("MongoDB Connected Successfully!");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};
module.exports = connectDB;

