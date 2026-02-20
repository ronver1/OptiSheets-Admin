"use client";

import { useState } from "react";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [out, setOut] = useState("");

  async function createCustomer() {
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ full_name: "Test Customer", email: "test@example.com" }),
    });
    setOut(await res.text());
  }

  async function createLicense() {
    const res = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ customer_id: null }),
    });
    setOut(await res.text());
  }

  async function exportExcel() {
    const res = await fetch("/api/admin/export", {
      headers: { "x-admin-key": adminKey },
    });
    if (!res.ok) {
      setOut(await res.text());
      return;
    }
    const blob = await res.blob();
    const cd = res.headers.get("content-disposition") || "";
    const filename = cd.includes("filename=")
      ? cd.split("filename=")[1].replace(/"/g, "")
      : "export.xlsx";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>OptiSheets Admin</h1>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3>Admin Key</h3>
        <input
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Paste ADMIN_API_KEY here"
          style={{ width: "100%", padding: 10 }}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={createCustomer} style={{ padding: 12, fontWeight: "bold" }}>
          Create Test Customer
        </button>
        <button onClick={createLicense} style={{ padding: 12, fontWeight: "bold" }}>
          Create License
        </button>
        <button onClick={exportExcel} style={{ padding: 12, fontWeight: "bold" }}>
          Export Excel
        </button>
      </div>

      <pre style={{ background: "#f4f4f4", padding: 12, whiteSpace: "pre-wrap" }}>{out}</pre>
    </div>
  );
}
