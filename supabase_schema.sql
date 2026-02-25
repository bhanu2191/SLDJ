-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    "regNum" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dob" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "class" TEXT NOT NULL,
    "guardian" TEXT,
    "guardianPhone" TEXT,
    "status" TEXT CHECK(status IN ('paid', 'pending', 'overdue')) DEFAULT 'pending',
    "avatar" TEXT,
    "gender" TEXT,
    "enrollments" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Operators Table
CREATE TABLE IF NOT EXISTS public.operators (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT DEFAULT 'operator',
    "status" TEXT DEFAULT 'active',
    "lastActive" TEXT DEFAULT 'Never',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    "id" SERIAL PRIMARY KEY,
    "regNum" TEXT NOT NULL REFERENCES public.students("regNum") ON DELETE CASCADE,
    "amount" DECIMAL(10,2) NOT NULL,
    "month" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "class" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Class Categories Table
CREATE TABLE IF NOT EXISTS public.class_categories (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "duration" TEXT DEFAULT '3 months',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Finance Records Table
CREATE TABLE IF NOT EXISTS public.finance_records (
    "id" SERIAL PRIMARY KEY,
    "type" TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Exam Results Table
CREATE TABLE IF NOT EXISTS public.exam_results (
    "id" SERIAL PRIMARY KEY,
    "regNum" TEXT NOT NULL REFERENCES public.students("regNum") ON DELETE CASCADE,
    "class_name" TEXT NOT NULL,
    "result" TEXT CHECK(result IN ('Pass', 'Fail', 'None')) DEFAULT 'None',
    "date" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SMS Settings Table
CREATE TABLE IF NOT EXISTS public.sms_settings (
    "id" SERIAL PRIMARY KEY,
    "provider" TEXT DEFAULT 'mock',
    "apiKey" TEXT,
    "senderId" TEXT,
    "adminPhone" TEXT,
    "reminderDate" INTEGER DEFAULT 7,
    "reminderTime" TEXT DEFAULT '09:00',
    "enabled" INTEGER DEFAULT 1,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert original mock setting row
INSERT INTO public.sms_settings ("provider", "apiKey", "senderId", "adminPhone") 
VALUES ('DefaultGateway', '', 'SLDJ', '')
ON CONFLICT DO NOTHING;

-- 8. SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    "id" SERIAL PRIMARY KEY,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT,
    "sent_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Finance Categories Table
CREATE TABLE IF NOT EXISTS public.finance_categories (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Finance Categories
INSERT INTO public.finance_categories ("name", "type") VALUES 
('Student Fees', 'income'),
('Material Sales', 'income'),
('Document Fee', 'income'),
('Other Income', 'income'),
('Rent', 'expense'),
('Utilities', 'expense'),
('Office Supplies', 'expense'),
('Marketing', 'expense'),
('Other Expenses', 'expense')
ON CONFLICT DO NOTHING;
