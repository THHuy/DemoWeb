// Automated tests for L'Ambiance Café HR Payroll Calculations

function calculateHourlySalary(
  actualHours: number,
  baseRate: number,
  allowances: number,
  deductions: number
): number {
  return actualHours * baseRate + allowances - deductions;
}

function calculateMonthlySalary(
  actualDays: number,
  standardDays: number,
  baseRate: number,
  allowances: number,
  deductions: number
): number {
  const basePay = (actualDays / standardDays) * baseRate;
  return Math.round(basePay + allowances - deductions);
}

function calculateWorkedHours(
  shiftStart: string, // "HH:MM"
  shiftEnd: string,
  checkIn: string, // "HH:MM"
  checkOut: string,
  breakMinutes: number,
  latePenaltyType: "warn" | "minute",
  earlyPenaltyType: "minute" | "no_shift"
): { workedHours: number; lateMins: number; earlyMins: number } {
  // Parse hours & minutes
  const [sH, sM] = shiftStart.split(":").map(Number);
  const [eH, eM] = shiftEnd.split(":").map(Number);
  const [ciH, ciM] = checkIn.split(":").map(Number);
  const [coH, coM] = checkOut.split(":").map(Number);

  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;
  const ciMins = ciH * 60 + ciM;
  const coMins = coH * 60 + coM;

  // Lateness
  const lateMins = Math.max(0, ciMins - startMins);
  
  // Early departure
  const earlyMins = Math.max(0, endMins - coMins);

  // Scheduled duration
  let durationMins = endMins - startMins - breakMinutes;

  if (earlyPenaltyType === "no_shift" && earlyMins > 0) {
    return { workedHours: 0, lateMins, earlyMins };
  }

  let penaltyMins = 0;
  if (latePenaltyType === "minute") {
    penaltyMins += lateMins;
  }
  if (earlyPenaltyType === "minute") {
    penaltyMins += earlyMins;
  }

  // Actual worked minutes
  const workedMins = Math.max(0, durationMins - penaltyMins);
  
  return {
    workedHours: parseFloat((workedMins / 60).toFixed(2)),
    lateMins,
    earlyMins,
  };
}

async function runTests() {
  console.log("⚡ BẮT ĐẦU CHẠY KIỂM THỬ PAYROLL & ATTENDANCE LOGIC ⚡\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${message ? `- ${message}` : ""}`);
      failed++;
    }
  }

  // --- Test Case 1: Lương Theo Giờ ---
  // Nhân viên làm 120 giờ, đơn giá 30k/h. Phụ cấp gửi xe 200k. Phạt đi trễ 50k.
  const hourlyPay = calculateHourlySalary(120, 30000, 200000, 50000);
  assert(
    "Lương theo giờ của nhân viên (120h * 30k + 200k - 50k = 3.750.000đ)",
    hourlyPay === 3750000,
    `Thực tế: ${hourlyPay}`
  );

  // --- Test Case 2: Lương Theo Tháng ---
  // Lương cơ bản 7M, công chuẩn 26 ngày. Nhân viên làm được 24 ngày công thực tế. Phụ cấp trách nhiệm 500k.
  const monthlyPay = calculateMonthlySalary(24, 26, 7000000, 500000, 0);
  assert(
    "Lương theo tháng của nhân viên ((24/26) * 7M + 500k = 6.961.538đ)",
    monthlyPay === 6961538,
    `Thực tế: ${monthlyPay}`
  );

  // --- Test Case 3: Chấm công đúng giờ ---
  // Scheduled: 08:00 - 12:00, Checkin: 07:58, Checkout: 12:02
  const shift1 = calculateWorkedHours("08:00", "12:00", "07:58", "12:02", 0, "warn", "minute");
  assert(
    "Đi làm đúng giờ: ca 4h, checkin sớm, checkout trễ. Công phải đủ 4h.",
    shift1.workedHours === 4.0 && shift1.lateMins === 0 && shift1.earlyMins === 0,
    `Thời gian tính công: ${shift1.workedHours}h, trễ: ${shift1.lateMins}p, sớm: ${shift1.earlyMins}p`
  );

  // --- Test Case 4: Đi trễ và về sớm (Trừ lương theo phút) ---
  // Scheduled: 06:00 - 12:00 (6h), Break: 0, Late type: minute, Early type: minute
  // Checkin: 06:20 (trễ 20p), Checkout: 11:30 (sớm 30p)
  // Thực tế: 6h - 50p = 5.17h (310 phút)
  const shift2 = calculateWorkedHours("06:00", "12:00", "06:20", "11:30", 0, "minute", "minute");
  assert(
    "Đi trễ + Về sớm (trừ theo phút): ca 6h trễ 20p sớm 30p. Công phải bằng 5.17h.",
    shift2.workedHours === 5.17 && shift2.lateMins === 20 && shift2.earlyMins === 30,
    `Thời gian tính công: ${shift2.workedHours}h, trễ: ${shift2.lateMins}p, sớm: ${shift2.earlyMins}p`
  );

  // --- Test Case 5: Về sớm hủy ca ---
  // Scheduled: 08:00 - 12:00, Checkin: 08:00, Checkout: 11:30 (sớm 30p), Early type: no_shift
  const shift3 = calculateWorkedHours("08:00", "12:00", "08:00", "11:30", 0, "warn", "no_shift");
  assert(
    "Về sớm bị hủy ca: ca 4h, checkout sớm 30p. Công phải bằng 0h.",
    shift3.workedHours === 0 && shift3.earlyMins === 30,
    `Thời gian tính công: ${shift3.workedHours}h, sớm: ${shift3.earlyMins}p`
  );

  // --- Test Case 6: Nghỉ giữa ca ---
  // Scheduled: 08:00 - 17:00 (9h), Break: 60 mins (1h), Checkin: 08:00, Checkout: 17:00
  const shift4 = calculateWorkedHours("08:00", "17:00", "08:00", "17:00", 60, "warn", "minute");
  assert(
    "Nghỉ giữa ca: ca 9h, nghỉ trưa 60p. Công phải bằng 8.0h.",
    shift4.workedHours === 8.0,
    `Thời gian tính công: ${shift4.workedHours}h`
  );

  console.log(`\n======================================`);
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log(`======================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
