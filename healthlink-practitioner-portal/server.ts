import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3001;
const SECRET_KEY = "healthlink-secret-key";

app.use(express.json());

// Mock Data
let reports = [
  {
    id: "1",
    userId: "PAT-8821",
    symptoms: ["fever", "cough", "shortness of breath"],
    recommendation: "Immediate medical attention required. Possible respiratory infection.",
    triageLevel: "emergency",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    reviewed: false
  },
  {
    id: "2",
    userId: "PAT-1234",
    symptoms: ["headache", "fatigue"],
    recommendation: "Rest and hydration. Monitor symptoms.",
    triageLevel: "routine",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    reviewed: true
  },
  {
    id: "3",
    userId: "PAT-5566",
    symptoms: ["chest pain", "dizziness"],
    recommendation: "Urgent evaluation needed. Potential cardiac event.",
    triageLevel: "urgent",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    reviewed: false
  }
];

let rules = [
  {
    id: "1",
    condition: "Severe Respiratory Distress",
    symptoms: ["shortness of breath", "chest pain", "bluish lips"],
    recommendation: "Call emergency services immediately.",
    triageLevel: "emergency",
    isActive: true
  },
  {
    id: "2",
    condition: "Common Cold",
    symptoms: ["runny nose", "sneezing", "mild cough"],
    recommendation: "Over-the-counter medication and rest.",
    triageLevel: "self-care",
    isActive: true
  }
];

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.post("/api/admin/login", (req, res) => {
  console.log("Login request received at /api/admin/login:", req.body);
  const { email, password } = req.body;
  // Mock login - any password works for demo
  if (email && password) {
    const user = { id: "admin-1", email, name: "Dr. Smith", role: "practitioner" };
    const token = jwt.sign(user, SECRET_KEY);
    res.json({ token, user });
  } else {
    res.status(400).json({ message: "Email and password required" });
  }
});

app.get("/api/admin/reports", authenticateToken, (req, res) => {
  res.json(reports);
});

app.get("/api/admin/reports/:id", authenticateToken, (req, res) => {
  const report = reports.find(r => r.id === req.params.id);
  if (report) res.json(report);
  else res.status(404).json({ message: "Report not found" });
});

app.get("/api/admin/rules", authenticateToken, (req, res) => {
  res.json(rules);
});

app.post("/api/admin/rules", authenticateToken, (req, res) => {
  const newRule = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
  rules.push(newRule);
  res.status(201).json(newRule);
});

app.put("/api/admin/rules/:id", authenticateToken, (req, res) => {
  const index = rules.findIndex(r => r.id === req.params.id);
  if (index !== -1) {
    rules[index] = { ...rules[index], ...req.body };
    res.json(rules[index]);
  } else {
    res.status(404).json({ message: "Rule not found" });
  }
});

app.delete("/api/admin/rules/:id", authenticateToken, (req, res) => {
  const index = rules.findIndex(r => r.id === req.params.id);
  if (index !== -1) {
    // Soft delete for demo
    rules[index].isActive = false;
    res.json({ message: "Rule deactivated" });
  } else {
    res.status(404).json({ message: "Rule not found" });
  }
});

app.get("/api/rules", (req, res) => {
  res.json(rules.filter(r => r.isActive));
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
