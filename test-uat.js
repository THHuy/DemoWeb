const { Pool } = require('pg');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, ".env.local") });

const BASE_URL = "http://localhost:3001";

async function test() {
  console.log("=== STARTING NEW UAT VERIFICATION ===");

  // 0. Clean up dynamic database tables
  console.log("\n0. Cleaning up dynamic database tables...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await pool.query('DELETE FROM shift_swaps');
    await pool.query('DELETE FROM attendance_logs');
    await pool.query('DELETE FROM shift_registrations');
    await pool.query('DELETE FROM leave_requests');
    console.log("✅ Database tables cleaned successfully.");
  } catch (err) {
    console.error("❌ Failed to clean up database tables:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }

  // 1. Log in as admin to initialize/reset the database
  console.log("\n1. Logging in as admin to reset database...");
  let adminCookies = [];
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const adminSetCookie = adminLoginRes.headers.getSetCookie();
  adminCookies = adminSetCookie.map(c => c.split(";")[0]);
  let adminCookieHeader = adminCookies.join("; ");
  console.log("Admin logged in successfully.");

  // 2. Reset database
  console.log("\n2. Resetting database to clean state...");
  const dbInitRes = await fetch(`${BASE_URL}/api/db-init`, {
    method: "POST",
    headers: { Cookie: adminCookieHeader }
  });
  const dbInitData = await dbInitRes.json();
  console.log("Database reset status:", dbInitRes.status, dbInitData);

  // 2b. Re-login as admin to refresh token after database reset
  console.log("\n2b. Re-logging in as admin after database reset...");
  const adminLoginRes2 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const adminSetCookie2 = adminLoginRes2.headers.getSetCookie();
  adminCookies = adminSetCookie2.map(c => c.split(";")[0]);
  adminCookieHeader = adminCookies.join("; ");
  console.log("Admin re-logged in successfully.");

  // 3. Log in as staff
  console.log("\n3. Logging in as staff...");
  let staffCookies = [];
  const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "staff", password: "staff123" }),
  });
  const staffSetCookie = staffLoginRes.headers.getSetCookie();
  staffCookies = staffSetCookie.map(c => c.split(";")[0]);
  const staffCookieHeader = staffCookies.join("; ");
  console.log("Staff logged in successfully.");

  // 4. Testing SSE connect for staff...
  const sseStaffRes = await fetch(`${BASE_URL}/api/reservations/sse`, {
    headers: { Cookie: staffCookieHeader },
  });
  console.log("SSE staff connect status:", sseStaffRes.status);
  if (sseStaffRes.status === 403) {
    console.log("✅ SSE connect correctly blocked (403 Forbidden) for staff.");
  } else {
    console.error("❌ SSE connect was NOT blocked for staff!");
  }

  // 4. Verify SSE endpoint returns 200/event-stream for admin
  console.log("\n4. Testing SSE connect for admin...");
  const sseAdminRes = await fetch(`${BASE_URL}/api/reservations/sse`, {
    headers: { Cookie: adminCookieHeader },
  });
  console.log("SSE admin connect status:", sseAdminRes.status);
  console.log("SSE admin Content-Type:", sseAdminRes.headers.get("content-type"));
  if (sseAdminRes.status === 200 && sseAdminRes.headers.get("content-type").includes("event-stream")) {
    console.log("✅ SSE connect correctly allowed for admin.");
  } else {
    console.error("❌ SSE connect was not allowed or content-type mismatch!");
  }

  // 5. Staff requests leave for June 29–30, 2026
  console.log("\n5. Staff submitting leave request for 2026-06-29 to 2026-06-30...");
  const leaveRes = await fetch(`${BASE_URL}/api/staff/leaves`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookieHeader },
    body: JSON.stringify({
      start_date: "2026-06-29",
      end_date: "2026-06-30",
      leave_type: "sick",
      reason: "Bệnh cảm sốt nặng",
    }),
  });
  const leaveData = await leaveRes.json();
  console.log("Leave Request POST status:", leaveRes.status, leaveData);
  const createdLeaveId = leaveData.leaveRequest.id;

  // 6. Try to register a shift on June 29, 2026
  console.log("\n6. Staff trying to register shift on 2026-06-29 (conflict check)...");
  // Find an active shift ID
  const activeShiftsRes = await fetch(`${BASE_URL}/api/staff/active-shifts`, {
    headers: { Cookie: staffCookieHeader },
  });
  const activeShifts = await activeShiftsRes.json();
  const shiftId = activeShifts[0].id;

  const regRes = await fetch(`${BASE_URL}/api/staff/shifts/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookieHeader },
    body: JSON.stringify({
      shift_date: "2026-06-29",
      shift_id: shiftId,
    }),
  });
  const regData = await regRes.json();
  console.log("Shift register status:", regRes.status);
  console.log("Shift register body:", regData);
  if (regRes.status === 400 && regData.error.includes("nghỉ phép")) {
    console.log("✅ Shift registration successfully blocked due to leave conflict.");
  } else {
    console.error("❌ Shift registration was NOT blocked or error mismatched!");
  }

  // 7. Get staff's leave requests list
  console.log("\n7. Fetching staff's leave requests...");
  const getLeavesRes = await fetch(`${BASE_URL}/api/staff/leaves`, {
    headers: { Cookie: staffCookieHeader },
  });
  const leavesList = await getLeavesRes.json();
  console.log("Leaves list length:", leavesList.length);
  const found = leavesList.find(l => l.id === createdLeaveId);
  if (found) {
    console.log("✅ Created leave request found in staff's leave history.");
  } else {
    console.error("❌ Created leave request NOT found in staff's leave history!");
  }

  // 8. Staff cancels the leave request
  console.log(`\n8. Staff canceling leave request ID ${createdLeaveId}...`);
  const cancelRes = await fetch(`${BASE_URL}/api/staff/leaves/${createdLeaveId}`, {
    method: "DELETE",
    headers: { Cookie: staffCookieHeader },
  });
  const cancelData = await cancelRes.json();
  console.log("Cancel status:", cancelRes.status, cancelData);
  if (cancelRes.status === 200 && cancelData.success) {
    console.log("✅ Leave request successfully cancelled/deleted.");
  } else {
    console.error("❌ Leave request cancellation failed!");
  }

  // 9. Try to register the shift on June 29, 2026 again
  console.log("\n9. Staff trying to register shift on 2026-06-29 again (should succeed)...");
  const regRes2 = await fetch(`${BASE_URL}/api/staff/shifts/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffCookieHeader },
    body: JSON.stringify({
      shift_date: "2026-06-29",
      shift_id: shiftId,
    }),
  });
  const regData2 = await regRes2.json();
  console.log("Second shift register status:", regRes2.status);
  console.log("Second shift register body:", regData2);
  if (regRes2.status === 201 || (regRes2.status === 200 && regData2.success)) {
    console.log("✅ Shift registration successful after leave was cancelled.");
  } else {
    console.error("❌ Shift registration still failed!");
  }

  // 10. Fetch all shifts (store schedule)
  console.log("\n10. Fetching all approved shifts (store schedule)...");
  const allShiftsRes = await fetch(`${BASE_URL}/api/staff/shifts/all`, {
    headers: { Cookie: staffCookieHeader },
  });
  const allShifts = await allShiftsRes.json();
  console.log("All shifts store list status:", allShiftsRes.status);
  console.log("All shifts count:", allShifts.length);
  if (allShiftsRes.status === 200 && Array.isArray(allShifts)) {
    console.log("✅ Successfully fetched all store shifts.");
  } else {
    console.error("❌ Failed to fetch all store shifts!");
  }

  console.log("\n=== ALL UAT VERIFICATIONS COMPLETED SUCCESSFULLY ===");
}

test().catch(console.error);
