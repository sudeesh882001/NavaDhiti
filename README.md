# Navadhiti Employee Management System

A responsive, full-stack employee management system built using **HTML**, **CSS (Bootstrap)**, and **JavaScript**, powered by **JSON Server** as the backend. This system is designed for structured employee onboarding and role-based access control.

---

## 🌟 Features

- Responsive Signup & Login UI
- Auto email & password generation
- Encrypted password storage using AES
- First user becomes **Superadmin** (CEO)
- Role-based onboarding flow:
  - Superadmin → can create Admins & Employees
  - Admin → can create Employees
  - Employee → view/search only
- Credentials sent to personal email via **EmailJS**
- Realtime form validations and success toasts
- Panel-based layout for easy navigation

---

## 🔧 Technologies Used

- **Frontend:** HTML5, CSS3, Bootstrap 5
- **Backend:** JSON Server (local)
- **Encryption:** [CryptoJS](https://www.npmjs.com/package/crypto-js)
- **Email Service:** [EmailJS](https://www.emailjs.com/)
- **HTTP Requests:** Axios

---

## 📁 Folder Structure

project/
│
├── index.html # Signup Page
├── login.html # Login Page
├── dashboard.html # Role-based dashboard
├── set_emp_id.html # Page to set custom employee ID
├── styles/
│ └── base.css # Shared styles
├── db.json # JSON Server database
├── README.md

