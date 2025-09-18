// This is a minimal Express backend for admin actions using Supabase service role key.
// DO NOT expose your service role key to the frontend or commit it to public repos.

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// Load from environment variables or hardcode for local testing (NOT recommended for production)
const SUPABASE_URL = process.env.SUPABASE_URL || "https://YOUR_PROJECT.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_ROLE_KEY";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Create a new user (admin only)
app.post("/admin/create-user", async (req, res) => {
  const { email, password, isAdmin, d_uuid } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required." });
  }
  try {
    // 1. Create user in auth
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Insert into users table
    const { error: dbError } = await supabase.from("users").insert({
      uuid: data.user.id,
      email,
      isAdmin: !!isAdmin,
      d_uuid: d_uuid || null,
    });
    if (dbError) return res.status(400).json({ error: dbError.message });

    res.json({ message: "User created", user: { email, isAdmin, d_uuid } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user (admin only)
app.delete("/admin/delete-user/:uuid", async (req, res) => {
  const { uuid } = req.params;
  try {
    await supabase.auth.admin.deleteUser(uuid);
    await supabase.from("users").delete().eq("uuid", uuid);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a department
app.post("/admin/create-department", async (req, res) => {
  const { d_name } = req.body;
  if (!d_name) return res.status(400).json({ error: "Department name required." });
  try {
    const { error } = await supabase.from("department").insert({ d_name });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Department created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a department
app.delete("/admin/delete-department/:d_uuid", async (req, res) => {
  const { d_uuid } = req.params;
  try {
    await supabase.from("department").delete().eq("d_uuid", d_uuid);
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Admin backend running on port ${PORT}`);
});