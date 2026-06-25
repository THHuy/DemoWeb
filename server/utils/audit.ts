import pool from "../db";

export async function logAudit(
  userId: number | null | undefined,
  action: string,
  targetType: string,
  targetId: number | null,
  oldValues: any = null,
  newValues: any = null
) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId || null,
        action,
        targetType,
        targetId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null
      ]
    );
  } catch (error) {
    console.error("Failed to write audit log to DB:", error);
  }
}
