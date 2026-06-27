-- L'Ambiance Café Admin Database Schema

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('coffee', 'tea', 'pastry', 'dish')),
  price VARCHAR(50) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  show_on_website BOOLEAN DEFAULT true,
  show_on_pos BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT,
  excerpt VARCHAR(1000),
  cover_image TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(200),
  avatar_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id SERIAL PRIMARY KEY,
  table_number VARCHAR(50) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0)
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  guests INTEGER NOT NULL CHECK (guests > 0),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(booking_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);

-- Migration safety column addition
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL;

-- -------------------------------------------------------------
-- L'Ambiance Café HR Module Schema
-- -------------------------------------------------------------

-- Roles (Vai trò)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL
);

-- Employees (Hồ sơ nhân viên)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(150),
  cccd VARCHAR(50),
  address TEXT,
  date_of_birth DATE,
  hire_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'on_leave')),
  avatar_url TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee Roles (Liên kết nhân viên - vai trò)
CREATE TABLE IF NOT EXISTS employee_roles (
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, role_id)
);

-- Work Shifts (Ca làm việc)
CREATE TABLE IF NOT EXISTS work_shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  day_value NUMERIC(3, 2) DEFAULT 1.0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  barista_slots INTEGER DEFAULT 0,
  cashier_slots INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shift Registrations (Đăng ký ca)
CREATE TABLE IF NOT EXISTS shift_registrations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_id INTEGER REFERENCES work_shifts(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (employee_id, shift_date, shift_id)
);

-- Shift Swapping (Đổi ca)
CREATE TABLE IF NOT EXISTS shift_swaps (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  target_employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  requester_registration_id INTEGER REFERENCES shift_registrations(id) ON DELETE CASCADE,
  target_registration_id INTEGER REFERENCES shift_registrations(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Logs (Chấm công)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_id INTEGER REFERENCES work_shifts(id) ON DELETE SET NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  device VARCHAR(255),
  ip VARCHAR(100),
  gps_location VARCHAR(255),
  is_late BOOLEAN DEFAULT false,
  is_early BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  early_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave Requests (Nghỉ phép)
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'unpaid')),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salary Configurations (Cấu hình lương)
CREATE TABLE IF NOT EXISTS salary_configs (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  salary_type VARCHAR(50) NOT NULL CHECK (salary_type IN ('hourly', 'monthly')),
  base_rate NUMERIC(15, 2) NOT NULL,
  standard_working_days INTEGER DEFAULT 26,
  meal_allowance NUMERIC(15, 2) DEFAULT 0,
  parking_allowance NUMERIC(15, 2) DEFAULT 0,
  responsibility_allowance NUMERIC(15, 2) DEFAULT 0,
  attendance_allowance NUMERIC(15, 2) DEFAULT 0,
  sales_bonus NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salary Records (Bản ghi lương tháng)
CREATE TABLE IF NOT EXISTS salary_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  pay_month VARCHAR(7) NOT NULL, -- Định dạng YYYY-MM
  actual_hours NUMERIC(10, 2) DEFAULT 0,
  actual_days NUMERIC(10, 2) DEFAULT 0,
  base_salary NUMERIC(15, 2) DEFAULT 0,
  allowance_total NUMERIC(15, 2) DEFAULT 0,
  deduction_total NUMERIC(15, 2) DEFAULT 0,
  net_salary NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (employee_id, pay_month)
);

-- Salary Allowances (Chi tiết phụ cấp)
CREATE TABLE IF NOT EXISTS salary_allowances (
  id SERIAL PRIMARY KEY,
  salary_record_id INTEGER REFERENCES salary_records(id) ON DELETE CASCADE,
  allowance_type VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Salary Deductions (Chi tiết khấu trừ)
CREATE TABLE IF NOT EXISTS salary_deductions (
  id SERIAL PRIMARY KEY,
  salary_record_id INTEGER REFERENCES salary_records(id) ON DELETE CASCADE,
  deduction_type VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs (Lịch sử hệ thống)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR Settings (Cấu hình đi trễ/về sớm)
CREATE TABLE IF NOT EXISTS hr_settings (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  description TEXT
);

-- Migration safety for work_shifts slots columns
ALTER TABLE work_shifts ADD COLUMN IF NOT EXISTS barista_slots INTEGER DEFAULT 0;
ALTER TABLE work_shifts ADD COLUMN IF NOT EXISTS cashier_slots INTEGER DEFAULT 0;

-- Update default limits if not already configured
UPDATE work_shifts SET barista_slots = 2, cashier_slots = 1 WHERE code = 'sang';
UPDATE work_shifts SET barista_slots = 2, cashier_slots = 1 WHERE code = 'chieu';
UPDATE work_shifts SET barista_slots = 3, cashier_slots = 2 WHERE code = 'toi';

-- -------------------------------------------------------------
-- L'Ambiance Café POS Module Schema
-- -------------------------------------------------------------

-- POS Orders (Hóa đơn bán hàng)
CREATE TABLE IF NOT EXISTS pos_orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  customer_name VARCHAR(200),
  customer_phone VARCHAR(50),
  customer_address TEXT,
  order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('dine_in', 'take_away', 'delivery')),
  delivery_partner VARCHAR(50), -- 'grab', 'shopee', 'befood', 'internal'
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'sent_kitchen', 'preparing', 'completed', 'served', 'paid', 'done', 'cancelled')),
  notes TEXT,
  discount_type VARCHAR(50), -- 'percentage', 'amount'
  discount_value NUMERIC(15, 2) DEFAULT 0,
  discount_reason VARCHAR(255),
  vat_rate NUMERIC(5, 2) DEFAULT 10.0,
  surcharge NUMERIC(15, 2) DEFAULT 0,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_methods JSONB, -- [{"method":"cash", "amount":50000}]
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Order Items (Chi tiết hóa đơn món ăn)
CREATE TABLE IF NOT EXISTS pos_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15, 2) NOT NULL,
  total_price NUMERIC(15, 2) NOT NULL,
  size VARCHAR(50) DEFAULT 'M',
  ice_level VARCHAR(50) DEFAULT '100%',
  sugar_level VARCHAR(50) DEFAULT '100%',
  temperature VARCHAR(50) DEFAULT 'cold',
  toppings JSONB, -- [{"name": "Trân châu", "price": 5000}]
  notes TEXT,
  voided BOOLEAN DEFAULT false,
  void_reason VARCHAR(255),
  void_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- POS Audit Logs (Lịch sử thao tác POS)
CREATE TABLE IF NOT EXISTS pos_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE,
  details TEXT,
  ip_address VARCHAR(100),
  device VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Stock (Tồn kho nguyên liệu món ăn)
CREATE TABLE IF NOT EXISTS inventory_stock (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE UNIQUE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_threshold INTEGER DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_orders_code ON pos_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_table ON pos_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON pos_order_items(order_id);


