import os
import sqlite3


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATABASE_PATH = os.path.join(
    BASE_DIR,
    "users.db"
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_db():

    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=30
    )

    connection.row_factory = sqlite3.Row

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    return connection


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_database():

    connection = get_db()

    cursor = connection.cursor()


    # --------------------------------------------------------
    # USERS
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


    # --------------------------------------------------------
    # SESSIONS
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            token_hash TEXT UNIQUE NOT NULL,

            expires_at TEXT NOT NULL,

            revoked_at TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
        """
    )


    # --------------------------------------------------------
    # STUDIES
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS studies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            owner_id INTEGER NOT NULL,

            title TEXT NOT NULL,

            patient_id TEXT,

            modality TEXT,

            study_instance_uid TEXT,

            description TEXT,

            status TEXT NOT NULL DEFAULT 'pending',

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (owner_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
        """
    )


    # --------------------------------------------------------
    # AI ANALYSES
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            study_id INTEGER,

            user_id INTEGER NOT NULL,

            model_name TEXT NOT NULL,

            model_version TEXT,

            tumor_pixels INTEGER,

            tumor_percentage REAL,

            threshold REAL,

            result_json TEXT,

            processing_time_ms REAL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (study_id)
            REFERENCES studies(id)
            ON DELETE CASCADE,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
        """
    )


    # --------------------------------------------------------
    # REPORTS
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            study_id INTEGER NOT NULL,

            user_id INTEGER NOT NULL,

            report_text TEXT NOT NULL,

            llm_provider TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (study_id)
            REFERENCES studies(id)
            ON DELETE CASCADE,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
        """
    )


    # --------------------------------------------------------
    # AUDIT LOGS
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            action TEXT NOT NULL,

            resource_type TEXT,

            resource_id TEXT,

            details TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE SET NULL
        )
        """
    )


    # --------------------------------------------------------
    # USER SETTINGS
    # --------------------------------------------------------

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,

            llm_provider TEXT NOT NULL DEFAULT 'ollama',

            privacy_mode INTEGER NOT NULL DEFAULT 1,

            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
        """
    )


    connection.commit()

    connection.close()


# ============================================================
# INITIALIZE DATABASE
# ============================================================

init_database()