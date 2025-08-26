require("dotenv").config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('#routes/router'); // .js extension not required in CommonJS
const cookieParser = require("cookie-parser");

const connectDB = require("#db/mongo"); // Using @/ alias

// Connect to MongoDB
connectDB();

const app = express();

app.use("/upload", express.static(path.join(process.cwd(), "public", "upload")));


app.use(cors({ origin: "http://localhost:3000", credentials: true })); // NOT '*'
app.use(cookieParser(`${process.env.JWT_SECRET}`)); // Use your JWT secret for cookie signing
app.set("trust proxy", 1); // if behind proxy

// ✅ Always parse JSON & URL-encoded bodies (safe even if no body)
app.use(express.json({ limit: "10mb", type: ["application/json", "application/*+json"] }));
app.use(express.urlencoded({ extended: true }));


// ✅ Optional: log everything with method, URL, content-type, and parsed body
app.use((req, _res, next) => {
    const ct = req.headers["content-type"];
    console.log(`[IN] ${req.method} ${req.originalUrl} ct=${ct || "(none)"} body=`, req.params);
    next();
});

// mount API
app.use("/api", routes);

// health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// error handler (last)
// app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`API running on http://localhost:${process.env.PORT}`);
});
