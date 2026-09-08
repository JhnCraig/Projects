import os
import re
import uuid
from flask import Flask, jsonify, render_template, request, send_from_directory

try:
    import mysql.connector
    from mysql.connector import Error
except ImportError:  # pragma: no cover
    mysql = None
    Error = Exception


BASE_DIR = os.path.dirname(__file__)
PROJECT_DIR = os.path.dirname(BASE_DIR)
CSS_DIR = os.path.join(BASE_DIR, 'css')
JS_DIR = os.path.join(BASE_DIR, 'js')
ADMIN_IMG_DIR = os.path.join(BASE_DIR, 'img')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
IMG_DIR = os.path.join(PROJECT_DIR, 'img')
UPLOAD_DIR = IMG_DIR
ALLOWED_IMAGE_EXTENSIONS = {'.gif', '.jpeg', '.jpg', '.png', '.webp'}

# =========================================================
# Connection to the Database
# =========================================================

MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
MYSQL_PORT = int(os.getenv('MYSQL_PORT', '3301'))
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'kwin1818')
MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'sbdc_web')

# ===========================================================

app = Flask(__name__, template_folder=TEMPLATES_DIR)


@app.after_request
def add_api_cors_headers(response):
    if request.path.startswith('/api/'):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


def get_db_connection():
    if mysql is None:
        raise RuntimeError('mysql-connector-python is required. Install it with: pip install mysql-connector-python')
    return mysql.connector.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        autocommit=True,
    )


def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_uploaded_file(file_storage, desired_name=''):
    if file_storage is None or not getattr(file_storage, 'filename', ''):
        return ''

    ensure_upload_dir()
    filename = os.path.basename(file_storage.filename)
    original_stem, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError('Only GIF, JPEG, PNG, and WEBP images are allowed.')
    name_source = desired_name.strip() or original_stem
    safe_stem = re.sub(r'[^A-Za-z0-9._-]+', '_', name_source).strip('._-') or f'image-{uuid.uuid4().hex}'
    safe_name = f'{safe_stem}{ext.lower()}'
    if os.path.exists(os.path.join(UPLOAD_DIR, safe_name)):
        safe_name = f'{safe_stem}-{uuid.uuid4().hex}{ext.lower()}'
    file_storage.save(os.path.join(UPLOAD_DIR, safe_name))
    return safe_name


def remove_uploaded_file(image_path):
    if not image_path:
        return

    image_name = os.path.basename(image_path)
    image_file = os.path.join(IMG_DIR, image_name)
    if os.path.isfile(image_file):
        os.remove(image_file)


def init_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS project_entries (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                file_name VARCHAR(255),
                image_path VARCHAR(255),
                source VARCHAR(255),
                project_name VARCHAR(255),
                location VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                description TEXT,
                scope_of_work TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )
        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = %s AND table_name = 'project_entries' AND column_name = 'location'
            """,
            (MYSQL_DATABASE,),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("ALTER TABLE project_entries ADD COLUMN location VARCHAR(255)")

        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = %s AND table_name = 'project_entries' AND column_name = 'status'
            """,
            (MYSQL_DATABASE,),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("ALTER TABLE project_entries ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'")

        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = %s AND table_name = 'project_entries' AND column_name = 'description'
            """,
            (MYSQL_DATABASE,),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("ALTER TABLE project_entries ADD COLUMN description TEXT")

        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = %s AND table_name = 'project_entries' AND column_name = 'scope_of_work'
            """,
            (MYSQL_DATABASE,),
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("ALTER TABLE project_entries ADD COLUMN scope_of_work TEXT")
        conn.commit()
    finally:
        conn.close()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(CSS_DIR, filename)


@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(JS_DIR, filename)


@app.route('/img/<path:filename>')
def serve_img(filename):
    public_file = os.path.join(IMG_DIR, filename)
    if os.path.isfile(public_file):
        return send_from_directory(IMG_DIR, filename)
    return send_from_directory(ADMIN_IMG_DIR, filename)


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route('/api/entries', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def api_entries():
    if request.method == 'OPTIONS':
        return '', 204

    if request.method == 'GET':
        try:
            init_db()
            conn = get_db_connection()
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    '''
                          SELECT id, file_name, image_path, source, project_name, location, status,
                              description, scope_of_work, created_at
                    FROM project_entries
                    ORDER BY id DESC
                    '''
                )
                rows = cursor.fetchall()
                return jsonify({'status': 'success', 'data': rows}), 200
            finally:
                conn.close()
        except Error as exc:
            app.logger.exception('Unable to fetch entries: %s', exc)
            return jsonify({'error': 'Failed to fetch entries'}), 500

    if request.method == 'DELETE':
        payload = request.get_json(silent=True) or {}
        try:
            entry_id = int(payload.get('id'))
        except (TypeError, ValueError):
            return jsonify({'error': 'A valid entry id is required'}), 400

        try:
            init_db()
            conn = get_db_connection()
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute('SELECT image_path FROM project_entries WHERE id = %s', (entry_id,))
                entry = cursor.fetchone()
                if not entry:
                    return jsonify({'error': 'Entry not found'}), 404

                cursor.execute('DELETE FROM project_entries WHERE id = %s', (entry_id,))
                conn.commit()

                remove_uploaded_file(entry.get('image_path'))

                return jsonify({'status': 'success', 'message': 'Entry deleted successfully.'}), 200
            finally:
                conn.close()
        except Error as exc:
            app.logger.exception('Unable to delete entry: %s', exc)
            return jsonify({'error': 'Failed to delete entry'}), 500

    if request.method == 'PUT':
        payload = request.form.to_dict() if not request.is_json else (request.get_json(silent=True) or {})
        image_file = request.files.get('image') if request.files else None

        try:
            entry_id = int(payload.get('id'))
        except (TypeError, ValueError):
            return jsonify({'error': 'A valid entry id is required'}), 400

        try:
            init_db()
            conn = get_db_connection()
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute('SELECT * FROM project_entries WHERE id = %s', (entry_id,))
                current_entry = cursor.fetchone()
                if not current_entry:
                    return jsonify({'error': 'Entry not found'}), 404

                file_name = (payload.get('file_name') or '').strip()
                file_name = file_name or (image_file.filename if image_file else current_entry['file_name'] or '')
                source = (payload.get('source') or '').strip()
                project_name = (payload.get('project_name') or payload.get('project') or '').strip()
                location = (payload.get('location') or '').strip()
                status = (payload.get('status') or 'Pending').strip()
                description = (payload.get('description') or '').strip()
                scope_of_work = (payload.get('scope_of_work') or '').strip()
                image_name = save_uploaded_file(image_file, project_name)
                image_path = image_name or current_entry['image_path'] or ''

                cursor.execute(
                    '''
                    UPDATE project_entries
                    SET file_name = %s, image_path = %s, source = %s, project_name = %s,
                        location = %s, status = %s, description = %s, scope_of_work = %s
                    WHERE id = %s
                    ''',
                    (file_name, image_path, source, project_name, location, status, description,
                     scope_of_work, entry_id),
                )
                conn.commit()

                if image_name and current_entry['image_path'] and current_entry['image_path'] != image_name:
                    remove_uploaded_file(current_entry['image_path'])

                return jsonify({'status': 'success', 'message': 'Entry updated successfully.'}), 200
            finally:
                conn.close()
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        except Error as exc:
            app.logger.exception('Unable to update entry: %s', exc)
            return jsonify({'error': 'Failed to update entry'}), 500

    payload = request.form.to_dict() if not request.is_json else (request.get_json(silent=True) or {})
    image_files = request.files.getlist('image') if request.files else []
    image_files = [file for file in image_files if getattr(file, 'filename', '')]

    file_name = (payload.get('file_name') or '').strip()
    source = (payload.get('source') or '').strip()
    project_name = (payload.get('project_name') or payload.get('project') or '').strip()
    location = (payload.get('location') or '').strip()
    status = (payload.get('status') or 'Pending').strip()
    description = (payload.get('description') or '').strip()
    scope_of_work = (payload.get('scope_of_work') or '').strip()
    if not file_name and len(image_files) == 1:
        file_name = image_files[0].filename

    if not source and not project_name and not file_name and not image_files:
        return jsonify({'error': 'Entry is empty'}), 400

    try:
        init_db()
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            files_to_save = image_files or [None]
            for image_file in files_to_save:
                image_name = save_uploaded_file(image_file, project_name) if image_file else ''
                current_file_name = file_name or (image_file.filename if image_file else '')
                cursor.execute(
                    '''
                    INSERT INTO project_entries (
                        file_name, image_path, source, project_name, location, status, description, scope_of_work
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''',
                    (current_file_name, image_name, source, project_name, location, status, description,
                     scope_of_work),
                )
            conn.commit()
            saved_count = len(files_to_save)
            message = f'{saved_count} image(s) saved successfully.' if image_files else 'Entry saved successfully.'
            return jsonify({'status': 'success', 'message': message, 'saved_count': saved_count}), 200
        finally:
            conn.close()
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Error as exc:
        app.logger.exception('Unable to save entry: %s', exc)
        return jsonify({'error': 'Failed to save entry'}), 500


try:
    init_db()
except Exception as exc:
    app.logger.exception('MySQL initialization failed: %s', exc)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
