# Note: Flask and mysql-connector-python are need to be installed in the environment for this script to work.
# Note: pip install Flask or py -m install Flask if the  first command does not work.
# Note: pip install mysql-connector-python or py -m install mysql-connector-python if the first command does not work.

import json
import os
from datetime import datetime
import csv
import io
import uuid

try:
    from flask import Flask, abort, jsonify, redirect, render_template, request, send_from_directory, session
except ImportError as exc:
    raise ImportError(
        'Flask is required to run backEnd.py. Install it with: pip install Flask'
    ) from exc

try:
    import mysql.connector
    from mysql.connector import Error
    from werkzeug.security import check_password_hash, generate_password_hash
except ImportError:  # pragma: no cover - import fallback for environments without the package
    mysql = None
    Error = Exception
    try:
        from werkzeug.security import check_password_hash, generate_password_hash
    except ImportError:
        def generate_password_hash(password):
            return password

        def check_password_hash(hashed_password, password):
            return hashed_password == password


BASE_DIR = os.path.dirname(__file__)
CSS_DIR = os.path.join(BASE_DIR, 'css')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
MYSQL_PORT = int(os.getenv('MYSQL_PORT', '3306'))
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'craig013006')
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'sbdc')


def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def delete_uploaded_file(filename):
    if not filename:
        return
    file_path = os.path.join(UPLOAD_DIR, os.path.basename(filename))
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass


def save_uploaded_file(file_storage):
    if file_storage is None:
        return ''
    if getattr(file_storage, 'filename', None) in (None, ''):
        return ''

    ensure_upload_dir()
    filename = os.path.basename(file_storage.filename)
    stem, ext = os.path.splitext(filename)
    saved_name = f"{stem}-{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(UPLOAD_DIR, saved_name)
    file_storage.save(target_path)
    return saved_name


def get_db_connection():
    if mysql is None:
        raise RuntimeError(
            'mysql-connector-python is required. Install it with: pip install mysql-connector-python'
        )

    return mysql.connector.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        autocommit=True,
    )


def get_user_by_email(email):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM users WHERE email=%s LIMIT 1', ((email or '').strip().lower(),))
        return cursor.fetchone()
    finally:
        conn.close()


def get_dashboard_redirect_for_status(status):
    normalized_status = (status or 'Employee').strip().lower()
    if normalized_status in {'admin', 'administrator', 'superadmin', 'admin_user'}:
        return '/index.html'
    return '/employee'


def init_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                fname VARCHAR(100) NOT NULL,
                mname VARCHAR(100),
                lname VARCHAR(100) NOT NULL,
                contact VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'Employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )
        cursor.execute(
            '''
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = %s AND table_name = 'users' AND column_name = 'status'
            ''',
            (MYSQL_DATABASE,),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("ALTER TABLE users ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Employee'")
        cursor.execute(
            '''
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = %s AND table_name = 'users' AND column_name = 'password_hash'
            ''',
            (MYSQL_DATABASE,),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)')
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS sales (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                month VARCHAR(100),
                client_name VARCHAR(255),
                proj_code VARCHAR(100),
                tin VARCHAR(100),
                address TEXT,
                po_amount DECIMAL(12,2) DEFAULT 0,
                si_no VARCHAR(100),
                si_date DATE,
                inv_amount DECIMAL(12,2) DEFAULT 0,
                vat DECIMAL(12,2) DEFAULT 0,
                net_of_vat DECIMAL(12,2) DEFAULT 0,
                wtax_2 DECIMAL(12,2) DEFAULT 0,
                net_amount DECIMAL(12,2) DEFAULT 0,
                cash_in_bank DECIMAL(12,2) DEFAULT 0,
                transaction_date DATE,
                bank VARCHAR(255),
                remarks TEXT,
                po_no VARCHAR(100),
                description TEXT
            )
            '''
        )
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS accounting (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                cv_no VARCHAR(100),
                transaction_date DATE,
                payee VARCHAR(255),
                transaction_details TEXT,
                supplier_name VARCHAR(255),
                tin VARCHAR(100),
                address TEXT,
                amount DECIMAL(12,2) DEFAULT 0,
                vat_12 DECIMAL(12,2) DEFAULT 0,
                net_of_vat DECIMAL(12,2) DEFAULT 0,
                vat_exempt DECIMAL(12,2) DEFAULT 0,
                non_vat DECIMAL(12,2) DEFAULT 0,
                wtax DECIMAL(12,2) DEFAULT 0,
                si_no VARCHAR(100),
                si_date DATE,
                acct_code VARCHAR(100),
                acct_name VARCHAR(255),
                project VARCHAR(255),
                remark TEXT
            )
            '''
        )
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS sales_marketing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date_received DATE NOT NULL,
                client_company VARCHAR(255) NOT NULL,
                project_name VARCHAR(255) NOT NULL,
                source VARCHAR(100),
                project_value DECIMAL(15,2) DEFAULT 0.00,
                project_type VARCHAR(100),
                deadline_submission DATE,
                days_to_deadline INT,
                status ENUM(
                    'Pending',
                    'Ongoing',
                    'Submitted',
                    'Won',
                    'Lost',
                    'Cancelled'
                ) DEFAULT 'Pending',
                date_submitted DATE,
                response_time_days INT,
                follow_up_date DATE,
                days_to_follow_up INT,
                file VARCHAR(255),
                lost_reason TEXT,
                action_taken TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            )
            '''
        )
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS engineering (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                project_name VARCHAR(255),
                location VARCHAR(255),
                client VARCHAR(255),
                date VARCHAR(100),
                status TEXT,
                materials_needed TEXT,
                accomplishment_percentage DECIMAL(5,2),
                target_completion VARCHAR(100),
                manpower TEXT,
                documents VARCHAR(255),
                remarks TEXT,
                issues_and_concerns TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS purchasing (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                po_no VARCHAR(100),
                purchase_date DATE,
                supplier_name VARCHAR(255),
                tin VARCHAR(100),
                address TEXT,
                item_code VARCHAR(100),
                item_name VARCHAR(255),
                description TEXT,
                quantity DECIMAL(12,2) DEFAULT 0,
                unit VARCHAR(50),
                unit_price DECIMAL(12,2) DEFAULT 0,
                discount DECIMAL(12,2) DEFAULT 0,
                vat DECIMAL(12,2) DEFAULT 0,
                total_amount DECIMAL(12,2) DEFAULT 0,
                requested_by VARCHAR(255),
                approved_by VARCHAR(255),
                date_approved DATE,
                documents TEXT,
                remarks TEXT
            )
            '''
        )
    finally:
        conn.close()

# Use admin_sides as the template folder
ADMIN_SIDES_DIR = os.path.join(BASE_DIR, 'admin_sides')

app = Flask(__name__, template_folder='admin_sides')
app.secret_key = os.getenv('SECRET_KEY', 'sbdc-development-key')

# Determine which admin pages are available
EXCLUDED_TEMPLATES = set()

try:
    AVAILABLE_PAGES = [
        f for f in os.listdir(ADMIN_SIDES_DIR)
        if f.endswith('.html') and f not in EXCLUDED_TEMPLATES
    ]
except Exception:
    AVAILABLE_PAGES = []

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(
        os.path.join(ADMIN_SIDES_DIR, 'css'),
        filename
    )


@app.route('/img/<path:filename>')
def serve_img(filename):
    return send_from_directory(
        os.path.join(ADMIN_SIDES_DIR, 'img'),
        filename
    )


@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(
        os.path.join(ADMIN_SIDES_DIR, 'js'),
        filename
    )

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    safe_name = os.path.basename(filename)
    return send_from_directory(UPLOAD_DIR, safe_name)


def _normalize_date_value(value):
    if value in (None, ''):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()

    raw = str(value).strip()
    if not raw:
        return None

    try:
        return datetime.strptime(raw, '%Y-%m-%d').date().isoformat()
    except ValueError:
        try:
            return datetime.fromisoformat(raw.replace('Z', '+00:00')).date().isoformat()
        except ValueError:
            return raw

EMPLOYEE_SIDES_DIR = os.path.join(BASE_DIR, 'employee_sides')


EMPLOYEE_SIDES_DIR = os.path.join(BASE_DIR, 'employee_sides')


# =========================
# EMPLOYEE PAGES
# =========================

@app.route('/employee')
def employee():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'index.html'
    )


@app.route('/employee/index')
def employee_index():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'index.html'
    )


@app.route('/employee/accounting')
def employee_accounting():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'accounting.html'
    )


@app.route('/employee/sales')
def employee_sales():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'sales.html'
    )


@app.route('/employee/marketing')
def employee_marketing():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'marketing.html'
    )


@app.route('/employee/purchasing')
def employee_purchasing():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'purchasing.html'
    )


@app.route('/employee/engineering')
def employee_engineering():
    return send_from_directory(
        EMPLOYEE_SIDES_DIR,
        'engineering.html'
    )


# Employee CSS
@app.route('/employee/css/<path:filename>')
def employee_css(filename):
    return send_from_directory(
        os.path.join(EMPLOYEE_SIDES_DIR, 'css'),
        filename
    )


# Employee JS
@app.route('/employee/js/<path:filename>')
def employee_js(filename):
    return send_from_directory(
        os.path.join(EMPLOYEE_SIDES_DIR, 'js'),
        filename
    )


# Employee Images
@app.route('/employee/img/<path:filename>')
def employee_img(filename):
    return send_from_directory(
        os.path.join(EMPLOYEE_SIDES_DIR, 'img'),
        filename
    )


# For Accounting
def insert_accounting_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        payload = (
            data.get('cv_no') or '',
            _normalize_date_value(data.get('transaction_date') or data.get('date')),
            data.get('payee') or '',
            data.get('transaction_details') or '',
            data.get('supplier_name') or '',
            data.get('tin') or '',
            data.get('address') or '',
            _normalize_decimal(data.get('amount')),
            _normalize_decimal(data.get('vat_12')),
            _normalize_decimal(data.get('net_of_vat')),
            _normalize_decimal(data.get('vat_exempt')),
            _normalize_decimal(data.get('non_vat')),
            _normalize_decimal(data.get('wtax')),
            data.get('si_no') or '',
            _normalize_date_value(data.get('si_date')),
            data.get('account_code') or data.get('acct_code') or '',
            data.get('account_name') or data.get('acct_name') or '',
            data.get('project') or '',
            data.get('remark') or data.get('remarks') or '',
        )

        cursor.execute(
            '''
            INSERT INTO accounting (
                cv_no, transaction_date, payee, transaction_details, supplier_name, tin, address,
                amount, vat_12, net_of_vat, vat_exempt, non_vat, wtax,
                si_no, si_date, acct_code, acct_name, project, remark
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            payload,
        )
    finally:
        conn.close()


def get_accounting_entries():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT id, cv_no, transaction_date, payee, transaction_details, supplier_name, tin, address,
                   amount, vat_12, net_of_vat, vat_exempt, non_vat, wtax,
                   si_no, si_date, acct_code AS account_code, acct_name AS account_name, project, remark
            FROM accounting
            ORDER BY id DESC
            '''
        )
        return cursor.fetchall()
    finally:
        conn.close()


def update_accounting_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        entry_id = data.get('id') or data.get('accounting_id') or data.get('entry_id')
        if entry_id in (None, ''):
            return False

        payload = (
            data.get('cv_no') or '',
            _normalize_date_value(data.get('transaction_date') or data.get('date')),
            data.get('payee') or '',
            data.get('transaction_details') or '',
            data.get('supplier_name') or '',
            data.get('tin') or '',
            data.get('address') or '',
            _normalize_decimal(data.get('amount')),
            _normalize_decimal(data.get('vat_12')),
            _normalize_decimal(data.get('net_of_vat')),
            _normalize_decimal(data.get('vat_exempt')),
            _normalize_decimal(data.get('non_vat')),
            _normalize_decimal(data.get('wtax')),
            data.get('si_no') or '',
            _normalize_date_value(data.get('si_date')),
            data.get('account_code') or data.get('acct_code') or '',
            data.get('account_name') or data.get('acct_name') or '',
            data.get('project') or '',
            data.get('remark') or data.get('remarks') or '',
            entry_id,
        )

        cursor.execute(
            '''
            UPDATE accounting
            SET cv_no=%s, transaction_date=%s, payee=%s, transaction_details=%s, supplier_name=%s, tin=%s, address=%s,
                amount=%s, vat_12=%s, net_of_vat=%s, vat_exempt=%s, non_vat=%s, wtax=%s,
                si_no=%s, si_date=%s, acct_code=%s, acct_name=%s, project=%s, remark=%s
            WHERE id=%s
            ''',
            payload,
        )
        return True
    finally:
        conn.close()


def delete_accounting_entry(entry_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM accounting WHERE id=%s', (entry_id,))
    finally:
        conn.close()


def _normalize_decimal(value):
    if value in (None, ''):
        return 0.00
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.00


def _build_sales_description(data):
    description = (data.get('description') or '').strip()
    transaction_details = (data.get('transaction_details') or '').strip()
    if description and transaction_details:
        return f"{description} | {transaction_details}"
    return description or transaction_details or ''


def _normalize_marketing_status(value):
    if value in (None, ''):
        return 'Pending'

    raw = str(value).strip()
    if not raw:
        return 'Pending'

    mapping = {
        'inquiry': 'Pending',
        'proposal': 'Ongoing',
        'contract': 'Submitted',
        'pending': 'Pending',
        'ongoing': 'Ongoing',
        'submitted': 'Submitted',
        'won': 'Won',
        'lost': 'Lost',
        'cancelled': 'Cancelled',
    }
    return mapping.get(raw.lower(), raw)


def _normalize_marketing_int(value):
    if value in (None, ''):
        return 0
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return 0


def _normalize_marketing_decimal(value):
    if value in (None, ''):
        return 0.00
    if isinstance(value, (int, float)):
        return float(value)
    raw = str(value).strip()
    if not raw:
        return 0.00
    mapping = {
        'value 1': 100000.00,
        'value 2': 200000.00,
        'value 3': 300000.00,
    }
    lower = raw.lower()
    if lower in mapping:
        return mapping[lower]
    try:
        return float(raw)
    except ValueError:
        return 0.00


def insert_sales_marketing_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        uploaded_filename = ''
        file_storage = None
        if isinstance(data, dict):
            file_storage = data.get('_files', {}).get('documents_file') if isinstance(data.get('_files'), dict) else None
            if file_storage is None and hasattr(data, 'get'):
                file_storage = data.get('documents_file')
        if file_storage is None and request.files:
            file_storage = request.files.get('documents_file')
        if file_storage is not None:
            uploaded_filename = save_uploaded_file(file_storage)
        document_value = ''
        if uploaded_filename:
            document_value = uploaded_filename
        elif data.get('file') or data.get('file_name'):
            document_value = data.get('file') or data.get('file_name') or ''
        
        days_deadline_val = _normalize_marketing_int(data.get('days_deadline') or data.get('days_to_deadline'))
        response_time_val = _normalize_marketing_int(data.get('response_time') or data.get('response_time_days'))
        app.logger.info(f"Inserting sales_marketing: days_deadline={days_deadline_val}, response_time={response_time_val}")
        
        payload = (
            _normalize_date_value(data.get('date_received')) or datetime.now().date().isoformat(),
            data.get('client_company') or data.get('client_name') or '',
            data.get('project_name') or '',
            data.get('source') or '',
            data.get('project_value') or '',
            data.get('project_type') or '',
            _normalize_date_value(data.get('deadline_submission')),
            days_deadline_val,
            _normalize_marketing_status(data.get('status')),
            _normalize_date_value(data.get('date_submitted')),
            response_time_val,
            _normalize_date_value(data.get('follow_up_date')),
            _normalize_marketing_int(data.get('days_follow_up') or data.get('days_to_follow_up')),
            document_value,
            data.get('lost_reason') or data.get('remarks') or '',
            data.get('action_taken') or '',
        )
        cursor.execute(
            '''
            INSERT INTO sales_marketing (
                date_received, client_company, project_name, source, project_value, project_type,
                deadline_submission, days_to_deadline, status, date_submitted, response_time_days,
                follow_up_date, days_to_follow_up, file, lost_reason, action_taken
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            payload,
        )
        conn.commit()
        app.logger.info("Sales_marketing entry inserted successfully")
    finally:
        conn.close()


def get_sales_marketing_entries():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT id, date_received, status, client_company AS client_name, project_name, project_type, source, project_value,
                   deadline_submission, days_to_deadline AS days_deadline, date_submitted, response_time_days AS response_time,
                   follow_up_date, days_to_follow_up AS days_follow_up, file AS file_name, lost_reason, action_taken
            FROM sales_marketing
            ORDER BY id DESC
            '''
        )
        return cursor.fetchall()
    finally:
        conn.close()

def update_sales_marketing_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        entry_id = data.get('id') or data.get('sales_marketing_id') or data.get('entry_id')
        if entry_id in (None, ''):
            return False

        uploaded_filename = ''
        file_storage = None
        if isinstance(data, dict):
            file_storage = data.get('_files', {}).get('documents_file') if isinstance(data.get('_files'), dict) else None
            if file_storage is None and hasattr(data, 'get'):
                file_storage = data.get('documents_file')
        if file_storage is None and request.files:
            file_storage = request.files.get('documents_file')
        if file_storage is not None:
            uploaded_filename = save_uploaded_file(file_storage)
            if uploaded_filename:
                cursor.execute('SELECT file FROM sales_marketing WHERE id=%s', (entry_id,))
                result = cursor.fetchone()
                if result and result[0]:
                    delete_uploaded_file(result[0])

        document_value = ''
        if uploaded_filename:
            document_value = uploaded_filename
        elif data.get('file') or data.get('file_name'):
            document_value = data.get('file') or data.get('file_name') or ''

        days_deadline_val = _normalize_marketing_int(data.get('days_deadline') or data.get('days_to_deadline'))
        response_time_val = _normalize_marketing_int(data.get('response_time') or data.get('response_time_days'))
        app.logger.info(f"Updating sales_marketing id={entry_id}: days_deadline={days_deadline_val}, response_time={response_time_val}")

        payload = (
            _normalize_date_value(data.get('date_received')) or datetime.now().date().isoformat(),
            data.get('client_company') or data.get('client_name') or '',
            data.get('project_name') or '',
            data.get('source') or '',
            data.get('project_value') or '',
            data.get('project_type') or '',
            _normalize_date_value(data.get('deadline_submission')),
            days_deadline_val,
            _normalize_marketing_status(data.get('status')),
            _normalize_date_value(data.get('date_submitted')),
            response_time_val,
            _normalize_date_value(data.get('follow_up_date')),
            _normalize_marketing_int(data.get('days_follow_up') or data.get('days_to_follow_up')),
            document_value,
            data.get('lost_reason') or data.get('remarks') or '',
            data.get('action_taken') or '',
            entry_id,
        )
        cursor.execute(
            '''
            UPDATE sales_marketing
            SET date_received=%s, client_company=%s, project_name=%s, source=%s, project_value=%s, project_type=%s,
                deadline_submission=%s, days_to_deadline=%s, status=%s, date_submitted=%s, response_time_days=%s,
                follow_up_date=%s, days_to_follow_up=%s, file=%s, lost_reason=%s, action_taken=%s
            WHERE id=%s
            ''',
            payload,
        )
        conn.commit()
        app.logger.info(f"Sales_marketing entry id={entry_id} updated successfully")
        return True
    finally:
        conn.close()


def delete_sales_marketing_entry(entry_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT file FROM sales_marketing WHERE id=%s', (entry_id,))
        result = cursor.fetchone()
        if result and result[0]:
            delete_uploaded_file(result[0])
        cursor.execute('DELETE FROM sales_marketing WHERE id=%s', (entry_id,))
        conn.commit()
    finally:
        conn.close()



def insert_engineering_entry(data, files=None):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        uploaded_filename = ''
        file_storage = None
        if files is not None:
            file_storage = files.get('documents_file')
        if file_storage is not None:
            uploaded_filename = save_uploaded_file(file_storage)
        document_value = uploaded_filename or (data.get('documents') or data.get('file_name')) or ''
        payload = (
            data.get('project_name') or '',
            data.get('location') or '',
            data.get('client') or '',
            _normalize_date_value(data.get('date')),
            data.get('status') or '',
            data.get('materials_needed') or '',
            _normalize_decimal(data.get('accomplishment_percentage')),
            _normalize_date_value(data.get('target_completion')),
            data.get('manpower') or '',
            document_value,
            (data.get('remarks') or data.get('lost_reason')) or '',
            data.get('issues_and_concerns') or '',
        )
        cursor.execute(
            '''
            INSERT INTO engineering (
                project_name, location, client, date, status, materials_needed,
                accomplishment_percentage, target_completion, manpower, documents, remarks, issues_and_concerns
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            payload,
        )
        conn.commit()
    finally:
        conn.close()


def get_engineering_entries():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            '''
            SELECT id, project_name, location, client, date, status, materials_needed,
                   accomplishment_percentage, target_completion, manpower,
                   documents AS file_name, remarks AS lost_reason
            FROM engineering
            ORDER BY id DESC
            '''
        )
        return cursor.fetchall()
    finally:
        conn.close()


def update_engineering_entry(data, files=None):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        entry_id = data.get('id') or data.get('engineering_id') or data.get('entry_id')
        if entry_id in (None, ''):
            return False

        uploaded_filename = ''
        file_storage = None
        if files is not None:
            file_storage = files.get('documents_file')
        if file_storage is not None:
            uploaded_filename = save_uploaded_file(file_storage)
            if uploaded_filename:
                cursor.execute('SELECT documents FROM engineering WHERE id=%s', (entry_id,))
                result = cursor.fetchone()
                if result and result[0]:
                    delete_uploaded_file(result[0])

        document_value = uploaded_filename or (data.get('documents') or data.get('file_name')) or ''

        payload = (
            data.get('project_name') or '',
            data.get('location') or '',
            data.get('client') or '',
            _normalize_date_value(data.get('date')),
            data.get('status') or '',
            data.get('materials_needed') or '',
            _normalize_decimal(data.get('accomplishment_percentage')),
            _normalize_date_value(data.get('target_completion')),
            data.get('manpower') or '',
            document_value,
            (data.get('remarks') or data.get('lost_reason')) or '',
            data.get('issues_and_concerns') or '',
            entry_id,
        )
        cursor.execute(
            '''
            UPDATE engineering
            SET project_name=%s, location=%s, client=%s, date=%s, status=%s,
                materials_needed=%s, accomplishment_percentage=%s, target_completion=%s,
                manpower=%s, documents=%s, remarks=%s, issues_and_concerns=%s
            WHERE id=%s
            ''',
            payload,
        )
        return True
    finally:
        conn.close()


def delete_engineering_entry(entry_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT documents FROM engineering WHERE id=%s', (entry_id,))
        result = cursor.fetchone()
        if result and result[0]:
            delete_uploaded_file(result[0])
        cursor.execute('DELETE FROM engineering WHERE id=%s', (entry_id,))
    finally:
        conn.close()

def get_purchasing_schema_columns():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SHOW COLUMNS FROM purchasing')
        return {row[0] for row in cursor.fetchall()}
    finally:
        conn.close()


def insert_purchasing_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        columns = get_purchasing_schema_columns()
        po_column = 'po_no' if 'po_no' in columns else 'purchase_order_no'
        date_column = 'purchase_date' if 'purchase_date' in columns else 'order_date'
        uploaded_filename = ''
        file_storage = None
        if isinstance(data, dict):
            file_storage = data.get('_files', {}).get('documents_file') if isinstance(data.get('_files'), dict) else None
            if file_storage is None and hasattr(data, 'get'):
                file_storage = data.get('documents_file')
        if file_storage is None and request.files:
            file_storage = request.files.get('documents_file')
        if file_storage is not None:
            uploaded_filename = save_uploaded_file(file_storage)
        document_value = ''
        if uploaded_filename:
            document_value = uploaded_filename
        elif data.get('documents'):
            document_value = data.get('documents')
        payload = (
            data.get('purchase_order_no') or data.get('po_no') or '',
            _normalize_date_value(data.get('order_date') or data.get('purchase_date') or data.get('date')),
            data.get('supplier_name') or '',
            data.get('tin') or '',
            data.get('address') or '',
            data.get('item_code') or '',
            data.get('item_name') or '',
            data.get('description') or '',
            _normalize_decimal(data.get('quantity')),
            data.get('unit') or '',
            _normalize_decimal(data.get('unit_price')),
            _normalize_decimal(data.get('discount')),
            _normalize_decimal(data.get('vat')),
            _normalize_decimal(data.get('total_amount')),
            data.get('requested_by') or '',
            data.get('approved_by') or '',
            _normalize_date_value(data.get('date_approved')),
            document_value,
            data.get('remarks') or '',
        )
        cursor.execute(
            '''
            INSERT INTO purchasing (
                {po_column}, {date_column}, supplier_name, tin, address, item_code, item_name, description,
                quantity, unit, unit_price, discount, vat, total_amount, requested_by, approved_by,
                date_approved, documents, remarks
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            '''.format(po_column=po_column, date_column=date_column),
            payload,
        )
        conn.commit()
    finally:
        conn.close()


def get_purchasing_entries():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        columns = get_purchasing_schema_columns()
        po_column = 'po_no' if 'po_no' in columns else 'purchase_order_no'
        date_column = 'purchase_date' if 'purchase_date' in columns else 'order_date'
        cursor.execute(
            '''
            SELECT id, {po_column} AS po_no, {date_column} AS purchase_date, supplier_name, tin, address, item_code, item_name, description,
                   quantity, unit, unit_price, discount, vat, total_amount, requested_by, approved_by,
                   date_approved, documents, remarks
            FROM purchasing
            ORDER BY id DESC
            '''.format(po_column=po_column, date_column=date_column)
        )
        return cursor.fetchall()
    finally:
        conn.close()


def update_purchasing_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        columns = get_purchasing_schema_columns()
        po_column = 'po_no' if 'po_no' in columns else 'purchase_order_no'
        date_column = 'purchase_date' if 'purchase_date' in columns else 'order_date'
        entry_id = data.get('id') or data.get('purchasing_id') or data.get('entry_id')
        if entry_id in (None, ''):
            return False

        uploaded_filename = ''
        file_storage = None
        if isinstance(data, dict):
            file_storage = data.get('_files', {}).get('documents_file') if isinstance(data.get('_files'), dict) else None
            if file_storage is None and hasattr(data, 'get'):
                file_storage = data.get('documents_file')
        if file_storage is None and request.files:
            file_storage = request.files.get('documents_file')
        if file_storage is not None:
            uploaded_filename = save_uploaded_file(file_storage)
            if uploaded_filename:
                cursor.execute('SELECT documents FROM purchasing WHERE id=%s', (entry_id,))
                result = cursor.fetchone()
                if result and result[0]:
                    delete_uploaded_file(result[0])

        document_value = ''
        if uploaded_filename:
            document_value = uploaded_filename
        elif data.get('documents'):
            document_value = data.get('documents')

        payload = (
            data.get('purchase_order_no') or data.get('po_no') or '',
            _normalize_date_value(data.get('order_date') or data.get('purchase_date') or data.get('date')),
            data.get('supplier_name') or '',
            data.get('tin') or '',
            data.get('address') or '',
            data.get('item_code') or '',
            data.get('item_name') or '',
            data.get('description') or '',
            _normalize_decimal(data.get('quantity')),
            data.get('unit') or '',
            _normalize_decimal(data.get('unit_price')),
            _normalize_decimal(data.get('discount')),
            _normalize_decimal(data.get('vat')),
            _normalize_decimal(data.get('total_amount')),
            data.get('requested_by') or '',
            data.get('approved_by') or '',
            _normalize_date_value(data.get('date_approved')),
            document_value,
            data.get('remarks') or '',
            entry_id,
        )
        cursor.execute(
            '''
            UPDATE purchasing
            SET {po_column}=%s, {date_column}=%s, supplier_name=%s, tin=%s, address=%s, item_code=%s, item_name=%s, description=%s,
                quantity=%s, unit=%s, unit_price=%s, discount=%s, vat=%s, total_amount=%s, requested_by=%s, approved_by=%s,
                date_approved=%s, documents=%s, remarks=%s
            WHERE id=%s
            '''.format(po_column=po_column, date_column=date_column),
            payload,
        )
        conn.commit()
        return True
    finally:
        conn.close()


def delete_purchasing_entry(entry_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT documents FROM purchasing WHERE id=%s', (entry_id,))
        result = cursor.fetchone()
        if result and result[0]:
            delete_uploaded_file(result[0])
        cursor.execute('DELETE FROM purchasing WHERE id=%s', (entry_id,))
        conn.commit()
    finally:
        conn.close()


def insert_sales_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        payload = (
            data.get('month') or '',
            data.get('client_name') or '',
            data.get('project_code') or data.get('proj_code') or '',
            data.get('tin') or '',
            data.get('address') or '',
            _normalize_decimal(data.get('po_amount')),
            data.get('si_no') or '',
            data.get('si_date') or '',
            _normalize_decimal(data.get('inv_amount')),
            _normalize_decimal(data.get('vat')),
            _normalize_decimal(data.get('net_of_vat')),
            _normalize_decimal(data.get('wtax_2')),
            _normalize_decimal(data.get('net_amount')),
            _normalize_decimal(data.get('cash_in_bank')),
            data.get('transaction_date') or data.get('bank_date') or '',
            data.get('bank') or '',
            data.get('remarks') or '',
            data.get('po_no') or '',
            _build_sales_description(data),
        )

        cursor.execute(
            '''
            INSERT INTO sales (
                month, client_name, proj_code, tin, address, po_amount,
                si_no, si_date, inv_amount, vat, net_of_vat, wtax_2, net_amount,
                cash_in_bank, transaction_date, bank, remarks, po_no, description
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            payload,
        )
    finally:
        conn.close()


def update_sales_entry(data):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        sales_id = data.get('id') or data.get('sales_id') or data.get('entry_id')

        if sales_id in (None, ''):
            client_name = (data.get('client_name') or '').strip()
            month = (data.get('month') or '').strip()
            if client_name:
                cursor.execute(
                    '''
                    SELECT id FROM sales
                    WHERE LOWER(TRIM(COALESCE(client_name, ''))) = LOWER(%s)
                    ORDER BY id DESC
                    LIMIT 1
                    ''',
                    (client_name,),
                )
                match = cursor.fetchone()
                if match:
                    sales_id = match[0]
            if sales_id in (None, '') and month:
                cursor.execute(
                    '''
                    SELECT id FROM sales
                    WHERE LOWER(TRIM(COALESCE(month, ''))) = LOWER(%s)
                    ORDER BY id DESC
                    LIMIT 1
                    ''',
                    (month,),
                )
                match = cursor.fetchone()
                if match:
                    sales_id = match[0]

        if sales_id in (None, ''):
            return False

        payload = (
            data.get('month') or '',
            data.get('client_name') or '',
            data.get('project_code') or data.get('proj_code') or '',
            data.get('tin') or '',
            data.get('address') or '',
            _normalize_decimal(data.get('po_amount')),
            data.get('si_no') or '',
            data.get('si_date') or '',
            _normalize_decimal(data.get('inv_amount')),
            _normalize_decimal(data.get('vat')),
            _normalize_decimal(data.get('net_of_vat')),
            _normalize_decimal(data.get('wtax_2')),
            _normalize_decimal(data.get('net_amount')),
            _normalize_decimal(data.get('cash_in_bank')),
            data.get('transaction_date') or data.get('bank_date') or '',
            data.get('bank') or '',
            data.get('remarks') or '',
            data.get('po_no') or '',
            _build_sales_description(data),
            sales_id,
        )

        cursor.execute(
            '''
            UPDATE sales
            SET month=%s, client_name=%s, proj_code=%s, tin=%s, address=%s, po_amount=%s,
                si_no=%s, si_date=%s, inv_amount=%s, vat=%s, net_of_vat=%s, wtax_2=%s, net_amount=%s,
                cash_in_bank=%s, transaction_date=%s, bank=%s, remarks=%s, po_no=%s, description=%s
            WHERE id=%s
            ''',
            payload,
        )
        return True
    finally:
        conn.close()


def delete_sales_entry(sales_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM sales WHERE id=%s', (sales_id,))
    finally:
        conn.close()

@app.route('/api/accounting', methods=['GET', 'POST'])
def api_accounting(data=None):
    if request.method == 'GET':
        try:
            init_db()
            rows = get_accounting_entries()
            return jsonify({'status': 'success', 'data': rows}), 200
        except Error as exc:
            app.logger.exception('Unable to fetch accounting entries: %s', exc)
            return jsonify({'error': 'Failed to fetch accounting entries'}), 500

    if data is None:
        data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No JSON body received'}), 400

    action = (data.get('action') or '').lower()
    if action == 'edit':
        try:
            init_db()
            updated = update_accounting_entry(data)
            if not updated:
                return jsonify({'error': 'Missing accounting id'}), 400
            return jsonify({'status': 'success'}), 200
        except Error as exc:
            app.logger.exception('Unable to update accounting entry: %s', exc)
            return jsonify({'error': 'Failed to update accounting entry'}), 500

    try:
        init_db()
        insert_accounting_entry(data)
    except Error as exc:
        app.logger.exception('Unable to save accounting entry: %s', exc)
        return jsonify({'error': 'Failed to save accounting entry'}), 500

    return jsonify({'status': 'success'}), 200


@app.route('/api/accounting/<int:entry_id>', methods=['DELETE'])
def delete_accounting_route(entry_id):
    try:
        init_db()
        delete_accounting_entry(entry_id)
        return jsonify({'status': 'success'}), 200
    except Error as exc:
        app.logger.exception('Unable to delete accounting entry: %s', exc)
        return jsonify({'error': 'Failed to delete accounting entry'}), 500


@app.route('/api/sales_marketing', methods=['GET', 'POST'])
def api_sales_marketing(data=None):
    if request.method == 'GET':
        try:
            init_db()
            rows = get_sales_marketing_entries()
            return jsonify({'status': 'success', 'data': rows}), 200
        except Error as exc:
            app.logger.exception('Unable to fetch sales_marketing entries: %s', exc)
            return jsonify({'error': 'Failed to fetch sales_marketing entries'}), 500

    if data is None:
        if request.form:
            data = request.form.to_dict()
            if request.files:
                data['_files'] = {'documents_file': request.files.get('documents_file')}
        elif request.files:
            data = request.form.to_dict()
            data['_files'] = {'documents_file': request.files.get('documents_file')}
        else:
            data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data received'}), 400

    action = (data.get('action') or '').lower()
    if action == 'edit':
        try:
            init_db()
            updated = update_sales_marketing_entry(data)
            if not updated:
                return jsonify({'error': 'Missing sales_marketing id'}), 400
            return jsonify({'status': 'success'}), 200
        except Error as exc:
            app.logger.exception('Unable to update sales_marketing entry: %s', exc)
            return jsonify({'error': 'Failed to update sales_marketing entry'}), 500

    try:
        init_db()
        insert_sales_marketing_entry(data)
    except Error as exc:
        app.logger.exception('Unable to save sales_marketing entry: %s', exc)
        return jsonify({'error': 'Failed to save sales_marketing entry'}), 500

    return jsonify({'status': 'success'}), 200


@app.route('/api/engineering', methods=['GET', 'POST'])
def api_engineering(data=None):
    if request.method == 'GET':
        try:
            init_db()
            rows = get_engineering_entries()
            return jsonify({'status': 'success', 'data': rows}), 200
        except Error as exc:
            app.logger.exception('Unable to fetch engineering entries: %s', exc)
            return jsonify({'error': 'Failed to fetch engineering entries'}), 500

    if data is None:
        data = request.form.to_dict() if request.form else request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data received'}), 400

    action = (data.get('action') or '').lower()
    if action == 'edit':
        try:
            init_db()
            updated = update_engineering_entry(data, request.files)
            if not updated:
                return jsonify({'error': 'Missing engineering id'}), 400
            return jsonify({'status': 'success'}), 200
        except Error as exc:
            app.logger.exception('Unable to update engineering entry: %s', exc)
            return jsonify({'error': 'Failed to update engineering entry'}), 500

    try:
        init_db()
        insert_engineering_entry(data, request.files)
    except Error as exc:
        app.logger.exception('Unable to save engineering entry: %s', exc)
        return jsonify({'error': 'Failed to save engineering entry'}), 500

    return jsonify({'status': 'success'}), 200


@app.route('/api/engineering/<int:entry_id>', methods=['DELETE'])
def delete_engineering_route(entry_id):
    try:
        init_db()
        delete_engineering_entry(entry_id)
        return jsonify({'status': 'success'}), 200
    except Error as exc:
        app.logger.exception('Unable to delete engineering entry: %s', exc)
        return jsonify({'error': 'Failed to delete engineering entry'}), 500


@app.route('/api/sales_marketing/<int:entry_id>', methods=['DELETE'])
def delete_sales_marketing_route(entry_id):
    try:
        init_db()
        delete_sales_marketing_entry(entry_id)
        return jsonify({'status': 'success'}), 200
    except Error as exc:
        app.logger.exception('Unable to delete sales_marketing entry: %s', exc)
        return jsonify({'error': 'Failed to delete sales_marketing entry'}), 500


@app.route('/api/purchasing', methods=['GET', 'POST'])
def api_purchasing(data=None):
    if request.method == 'GET':
        try:
            init_db()
            rows = get_purchasing_entries()
            return jsonify({'status': 'success', 'data': rows}), 200
        except Error as exc:
            app.logger.exception('Unable to fetch purchasing entries: %s', exc)
            return jsonify({'error': 'Failed to fetch purchasing entries'}), 500

    if data is None:
        if request.form:
            data = request.form.to_dict()
            if request.files:
                data['_files'] = {'documents_file': request.files.get('documents_file')}
        elif request.files:
            data = request.form.to_dict()
            data['_files'] = {'documents_file': request.files.get('documents_file')}
        else:
            data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data received'}), 400

    action = (data.get('action') or '').lower()
    if action == 'edit':
        try:
            init_db()
            updated = update_purchasing_entry(data)
            if not updated:
                return jsonify({'error': 'Missing purchasing id'}), 400
            return jsonify({'status': 'success'}), 200
        except Error as exc:
            app.logger.exception('Unable to update purchasing entry: %s', exc)
            return jsonify({'error': 'Failed to update purchasing entry'}), 500

    try:
        init_db()
        insert_purchasing_entry(data)
    except Error as exc:
        app.logger.exception('Unable to save purchasing entry: %s', exc)
        return jsonify({'error': 'Failed to save purchasing entry'}), 500

    return jsonify({'status': 'success'}), 200


@app.route('/api/purchasing/<int:entry_id>', methods=['DELETE'])
def delete_purchasing_route(entry_id):
    try:
        init_db()
        delete_purchasing_entry(entry_id)
        return jsonify({'status': 'success'}), 200
    except Error as exc:
        app.logger.exception('Unable to delete purchasing entry: %s', exc)
        return jsonify({'error': 'Failed to delete purchasing entry'}), 500


@app.route('/api/sales', methods=['GET', 'POST'])
def api_sales(data=None):
    if request.method == 'GET':
        try:
            init_db()
            conn = get_db_connection()
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    '''
                    SELECT id, month, client_name, proj_code AS project_code, tin, address, po_amount,
                           si_no, si_date, inv_amount, vat, net_of_vat, wtax_2, net_amount,
                           cash_in_bank, transaction_date, bank, remarks, po_no, description
                    FROM sales
                    ORDER BY id DESC
                    '''
                )
                rows = cursor.fetchall()
            finally:
                conn.close()
            return jsonify({'status': 'success', 'data': rows}), 200
        except Error as exc:
            app.logger.exception('Unable to fetch sales entries: %s', exc)
            return jsonify({'error': 'Failed to fetch sales entries'}), 500

    if data is None:
        data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No JSON body received'}), 400

    action = (data.get('action') or '').lower()
    if action == 'edit':
        try:
            sales_id = data.get('id')
            if sales_id in (None, ''):
                return jsonify({'error': 'Missing sales id'}), 400
            init_db()
            updated = update_sales_entry(data)
            if not updated:
                return jsonify({'error': 'Unable to determine sales entry to update'}), 400
            return jsonify({'status': 'success'}), 200
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid sales id'}), 400
        except Error as exc:
            app.logger.exception('Unable to update sales entry: %s', exc)
            return jsonify({'error': 'Failed to update sales entry'}), 500

    if action == 'delete':
        try:
            sales_id = data.get('id')
            if sales_id in (None, ''):
                return jsonify({'error': 'Missing sales id'}), 400
            init_db()
            delete_sales_entry(int(sales_id))
            return jsonify({'status': 'success'}), 200
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid sales id'}), 400
        except Error as exc:
            app.logger.exception('Unable to delete sales entry: %s', exc)
            return jsonify({'error': 'Failed to delete sales entry'}), 500

    try:
        init_db()
        insert_sales_entry(data)
    except Error as exc:
        app.logger.exception('Unable to save sales entry: %s', exc)
        return jsonify({'error': 'Failed to save sales entry'}), 500

    return jsonify({'status': 'success'}), 200


@app.route('/api/sales/<int:sales_id>', methods=['DELETE'])
def delete_sales_route(sales_id):
    try:
        init_db()
        delete_sales_entry(sales_id)
        return jsonify({'status': 'success'}), 200
    except Error as exc:
        app.logger.exception('Unable to delete sales entry: %s', exc)
        return jsonify({'error': 'Failed to delete sales entry'}), 500


@app.route('/', defaults={'page': 'login.html'})
@app.route('/<path:page>')
def render_page(page):
    # serve templates except excluded ones
    if page not in AVAILABLE_PAGES:
        if not page.endswith('.html'):
            alt_page = f"{page}.html"
            if alt_page in AVAILABLE_PAGES:
                page = alt_page
    if page not in AVAILABLE_PAGES:
        abort(404)
    return render_template(page)


@app.route('/submit-entry', methods=['POST'])
def submit_entry():
    # Accept JSON or form submissions from the entry modal and route to the proper insert
    if request.is_json:
        data = request.get_json(silent=True)
    else:
        # allow form fields
        data = request.form.to_dict()

    kind = data.get('kind') or data.get('type') or request.args.get('kind')
    if not kind:
        return jsonify({'error': 'Missing kind/type parameter'}), 400

    if kind.lower() == 'accounting':
        return api_accounting(data=data)
    if kind.lower() == 'sales':
        return api_sales(data=data)
    if kind.lower() == 'sales_marketing':
        return api_sales_marketing(data=data)
    if kind.lower() == 'purchasing':
        return api_purchasing(data=data)
    if kind.lower() == 'engineering':
        return api_engineering(data=data)

    return jsonify({'error': 'Unsupported kind'}), 400


@app.route('/signup', methods=['POST'])
def signup():
    data = request.form.to_dict()
    fname = (data.get('fname') or data.get('Fname') or '').strip()
    mname = (data.get('mname') or data.get('Mname') or '').strip()
    lname = (data.get('lname') or data.get('Lname') or '').strip()
    contact = (data.get('contact') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password') or ''

    if not all([fname, lname, contact, email, password]):
        return render_template('signup.html', error='Please complete all required fields.'), 400
    if password != confirm_password:
        return render_template('signup.html', error='Passwords do not match.'), 400

    init_db()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO users (fname, mname, lname, contact, email, password, password_hash, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            (fname, mname, lname, contact, email, password, generate_password_hash(password), 'Employee'),
        )
    except Error:
        return render_template('signup.html', error='Unable to create account.'), 409
    finally:
        conn.close()
    return redirect('/login.html')


@app.route('/login', methods=['POST'])
def login():
    email = (request.form.get('email') or '').strip().lower()
    password = request.form.get('password') or ''
    user = get_user_by_email(email) if email else None
    if not user or not (user.get('password') == password or (user.get('password_hash') and check_password_hash(user['password_hash'], password))):
        return render_template('login.html', error='Invalid email or password.'), 401

    status = (user.get('status') or 'Employee').strip()
    session['user_id'] = user['id']
    session['user_name'] = user.get('fname') or 'User'
    session['user_status'] = status

    return redirect(get_dashboard_redirect_for_status(status))


@app.route('/api/current-user', methods=['GET'])
def api_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not logged in.'}), 401

    user_status = session.get('user_status', 'Employee')
    return jsonify({'status': 'success', 'name': session.get('user_name', ''), 'user_status': user_status}), 200


@app.route('/api/users', methods=['GET'])
def api_users():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, fname, mname, lname, contact, email, password, status, created_at FROM users ORDER BY id DESC')
        return jsonify({'status': 'success', 'data': cursor.fetchall()}), 200
    finally:
        conn.close()


@app.route('/api/users/<int:user_id>', methods=['PUT'])
def api_update_user(user_id):
    data = request.get_json(silent=True) or request.form.to_dict()
    fname = (data.get('fname') or '').strip()
    mname = (data.get('mname') or '').strip()
    lname = (data.get('lname') or '').strip()
    contact = (data.get('contact') or '').strip()
    status = (data.get('status') or 'Employee').strip()
    if not fname or not lname or not contact:
        return jsonify({'error': 'First name, last name, and contact are required.'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET fname=%s, mname=%s, lname=%s, contact=%s, status=%s WHERE id=%s', (fname, mname, lname, contact, status, user_id))
        conn.commit()
        return jsonify({'status': 'success'}), 200
    finally:
        conn.close()


@app.route('/api/users/<int:user_id>/password', methods=['PUT'])
def api_update_user_password(user_id):
    data = request.get_json(silent=True) or request.form.to_dict()
    password = (data.get('password') or '').strip()
    if not password:
        return jsonify({'error': 'Password is required.'}), 400
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET password=%s, password_hash=%s WHERE id=%s', (password, generate_password_hash(password), user_id))
        conn.commit()
        return jsonify({'status': 'success'}), 200
    finally:
        conn.close()


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE id=%s', (user_id,))
        conn.commit()
        return jsonify({'status': 'success'}), 200
    finally:
        conn.close()


@app.route('/import', methods=['POST'])
def import_file():
    # Accept a file upload (CSV) and import rows to MySQL for accounting or sales
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    kind = request.form.get('kind') or request.form.get('template') or request.args.get('kind')
    if not kind:
        return jsonify({'error': 'Missing kind parameter (accounting|sales)'}), 400

    table_map = {
        'accounting': 'accounting_entries',
        'sales': 'sales_entries',
    }
    table = table_map.get(kind.lower())
    if not table:
        return jsonify({'error': 'Unsupported kind for import'}), 400

    try:
        # parse CSV
        stream = io.TextIOWrapper(file.stream, encoding='utf-8')
        reader = csv.DictReader(stream)

        init_db()
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            for row in reader:
                # build dynamic insert based on CSV headers
                cols = []
                vals = []
                # always include timestamp
                cols.append('timestamp')
                vals.append(datetime.utcnow().isoformat() + 'Z')
                for k, v in row.items():
                    if k and v is not None and v != '':
                        cols.append(k)
                        vals.append(v)

                placeholders = ','.join(['%s'] * len(vals))
                cols_sql = ','.join(cols)
                sql = f"INSERT INTO {table} ({cols_sql}) VALUES ({placeholders})"
                cursor.execute(sql, tuple(vals))
        finally:
            conn.close()
    except Error as exc:
        app.logger.exception('Import failed: %s', exc)
        return jsonify({'error': 'Import failed'}), 500
    except Exception as exc:
        app.logger.exception('Import parse failed: %s', exc)
        return jsonify({'error': 'Failed to parse/import file'}), 500

    return jsonify({'status': 'imported'}), 200

try:
    init_db()
except Exception as exc:
    app.logger.exception('MySQL initialization failed: %s', exc)

    

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
