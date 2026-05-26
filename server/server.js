require('dotenv').config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");

// ---------------- SA ID Validation ----------------
function validateSAID(idNumber) {
  if (!idNumber || idNumber.length !== 13 || isNaN(idNumber)) {
    return { valid: false, error: "ID must be exactly 13 digits" };
  }

  const year = idNumber.substring(0, 2);
  const month = idNumber.substring(2, 4);
  const day = idNumber.substring(4, 6);
  const genderCode = idNumber.substring(6, 10);
  const citizenship = idNumber.substring(10, 11);

  // Validate birth date
  const birthDate = new Date(`19${year}-${month}-${day}`);
  if (isNaN(birthDate) || birthDate > new Date()) {
    return { valid: false, error: "Invalid birth date in ID" };
  }

  // Validate gender
  const gender = parseInt(genderCode) < 5000 ? "Female" : "Male";

  // Validate citizenship
  const isSACitizen = citizenship === "0" ? 1 : 0;

  // Luhn algorithm for check digit
  let sum = 0;
  let multiplier = 1;
  for (let i = 0; i < 13; i++) {
    let temp = parseInt(idNumber.charAt(i)) * multiplier;
    if (temp > 9) {
      temp = Math.floor(temp / 10) + (temp % 10);
    }
    sum += temp;
    multiplier = multiplier === 2 ? 1 : 2;
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: "Invalid ID (checksum failed)" };
  }

  // Format birth date as YYYY-MM-DD
  const fullYear = birthDate.getFullYear();
  const formattedBirthDate = `${fullYear}-${month}-${day}`;

  return {
    valid: true,
    birthDate: formattedBirthDate,
    gender: gender,
    isSACitizen: isSACitizen
  };
}

// ---------------- Database Initialization ----------------
async function initializeDatabase() {
  try {
    // Create table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS people (
        sa_id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        surname TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        gender TEXT,
        is_sa_citizen INTEGER DEFAULT 1
      )
    `);
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}

// Initialize database when server starts
initializeDatabase().catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

const app = express();
const PORT = process.env.SERVERPORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ---------------- Add Person ----------------
app.post("/add-person", async (req, res) => {
  try {
    const { sa_id, firstName, surname } = req.body;
    
    if (!sa_id || !firstName || !surname) {
      return res.status(400).json({ error: "SA ID, first name, and surname are required" });
    }

    // Validate SA ID
    const validation = validateSAID(sa_id);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if ID already exists
    const existing = await db.query("SELECT * FROM people WHERE sa_id = ?", [sa_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "A person with this ID already exists" });
    }

    const result = await db.query(
      "INSERT INTO people (sa_id, first_name, surname, birth_date, gender, is_sa_citizen) VALUES (?,?,?,?,?,?)",
      [sa_id, firstName, surname, validation.birthDate, validation.gender, validation.isSACitizen]
    );
    
    res.json({
      message: "Person added successfully",
      sa_id: sa_id,
      birthDate: validation.birthDate,
      gender: validation.gender,
      isSACitizen: validation.isSACitizen
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ---------------- Get People ----------------
app.get("/people", async (req, res) => {
  try {
    const rows = await db.query("SELECT * FROM people");
    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ---------------- Delete Person ----------------
app.delete("/person/:sa_id", async (req, res) => {
  try {
    const { sa_id } = req.params;
    const result = await db.query(
      "DELETE FROM people WHERE sa_id = ?",
      [sa_id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json({ message: "Person deleted successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// ---------------- Serve frontend ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});