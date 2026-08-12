from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import tensorflow as tf
import numpy as np

from PIL import Image

import io
import os
import base64
import sqlite3
import hashlib
import secrets


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Medical Image Viewer API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATABASE_PATH = os.path.join(
    BASE_DIR,
    "users.db"
)


def get_db():

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    return connection


def init_database():

    connection = get_db()

    cursor = connection.cursor()

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

    connection.commit()

    connection.close()


init_database()


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(
    password: str,
    salt: str | None = None
):

    if salt is None:
        salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()

    return password_hash, salt


def verify_password(
    password: str,
    stored_hash: str,
    salt: str
):

    password_hash, _ = hash_password(
        password,
        salt
    )

    return secrets.compare_digest(
        password_hash,
        stored_hash
    )


# ============================================================
# SIMPLE AUTH TOKEN
# ============================================================

active_tokens = {}


def create_token(user_id):

    token = secrets.token_urlsafe(32)

    active_tokens[token] = user_id

    return token


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):

    name: str
    email: str
    password: str


class LoginRequest(BaseModel):

    email: str
    password: str


# ============================================================
# CUSTOM MODEL FUNCTIONS
# ============================================================

def dice_coefficient(
    y_true,
    y_pred,
    smooth=1e-6
):

    y_true = tf.cast(
        y_true,
        tf.float32
    )

    y_pred = tf.cast(
        y_pred,
        tf.float32
    )

    y_true = tf.reshape(
        y_true,
        [-1]
    )

    y_pred = tf.reshape(
        y_pred,
        [-1]
    )

    intersection = tf.reduce_sum(
        y_true * y_pred
    )

    return (
        (
            2.0 * intersection
            + smooth
        )
        /
        (
            tf.reduce_sum(y_true)
            +
            tf.reduce_sum(y_pred)
            +
            smooth
        )
    )


def dice_loss(
    y_true,
    y_pred
):

    return 1.0 - dice_coefficient(
        y_true,
        y_pred
    )


def combined_loss(
    y_true,
    y_pred
):

    bce = tf.keras.losses.binary_crossentropy(
        y_true,
        y_pred
    )

    return (
        tf.reduce_mean(bce)
        +
        dice_loss(
            y_true,
            y_pred
        )
    )


# ============================================================
# MODEL
# ============================================================

MODEL_PATH = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "Training model",
        "brain_tumor_unet.keras",
    )
)


model = None


try:

    print(
        "Loading AI model..."
    )

    print(
        f"Model path: {MODEL_PATH}"
    )

    model = tf.keras.models.load_model(
        MODEL_PATH,
        custom_objects={
            "dice_coefficient":
                dice_coefficient,

            "dice_loss":
                dice_loss,

            "combined_loss":
                combined_loss,
        }
    )

    print(
        "AI model loaded successfully."
    )

except Exception as e:

    print(
        f"WARNING: Could not load AI model: {e}"
    )


# ============================================================
# SETTINGS
# ============================================================

IMAGE_SIZE = (256, 256)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message":
            "Medical Image Viewer API is running"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    return {
        "status": "healthy",

        "service":
            "medical-viewer-backend",

        "model_loaded":
            model is not None,
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/api/auth/register")
def register(
    request: RegisterRequest
):

    name = request.name.strip()

    email = (
        request.email
        .strip()
        .lower()
    )

    password = request.password


    # --------------------------------------------------------
    # Validation
    # --------------------------------------------------------

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name is required."
        )


    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required."
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must be at least "
                "6 characters long."
            )
        )


    # --------------------------------------------------------
    # Check existing user
    # --------------------------------------------------------

    connection = get_db()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    existing_user = cursor.fetchone()


    if existing_user:

        connection.close()

        raise HTTPException(
            status_code=409,
            detail=(
                "An account with this email "
                "already exists."
            )
        )


    # --------------------------------------------------------
    # Hash password
    # --------------------------------------------------------

    password_hash, salt = hash_password(
        password
    )


    # --------------------------------------------------------
    # Create user
    # --------------------------------------------------------

    cursor.execute(
        """
        INSERT INTO users
        (
            name,
            email,
            password_hash,
            salt
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            name,
            email,
            password_hash,
            salt,
        )
    )

    connection.commit()

    user_id = cursor.lastrowid

    connection.close()


    # --------------------------------------------------------
    # Create token
    # --------------------------------------------------------

    token = create_token(
        user_id
    )


    return {

        "success": True,

        "message":
            "Account created successfully.",

        "user": {
            "email": email,
            "name": name,
        },

        "token": token,
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/auth/login")
def login(
    request: LoginRequest
):

    email = (
        request.email
        .strip()
        .lower()
    )

    password = request.password


    connection = get_db()

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            name,
            email,
            password_hash,
            salt
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    user = cursor.fetchone()

    connection.close()


    # --------------------------------------------------------
    # Check credentials
    # --------------------------------------------------------

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )


    valid_password = verify_password(
        password,
        user["password_hash"],
        user["salt"]
    )


    if not valid_password:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )


    # --------------------------------------------------------
    # Create token
    # --------------------------------------------------------

    token = create_token(
        user["id"]
    )


    return {

        "success": True,

        "message":
            "Login successful.",

        "user": {
            "email":
                user["email"],

            "name":
                user["name"],
        },

        "token": token,
    }


# ============================================================
# AI SEGMENTATION
# ============================================================

@app.post("/api/segment")
async def segment_image(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if model is None:

        raise HTTPException(
            status_code=500,
            detail="AI model is not loaded."
        )


    try:

        # ----------------------------------------------------
        # Read uploaded image
        # ----------------------------------------------------

        contents = await file.read()

        image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")


        # ----------------------------------------------------
        # Original dimensions
        # ----------------------------------------------------

        original_width, original_height = (
            image.size
        )


        # ----------------------------------------------------
        # Resize
        # ----------------------------------------------------

        resized = image.resize(
            IMAGE_SIZE
        )


        image_array = np.array(
            resized
        ).astype(np.float32)


        # ----------------------------------------------------
        # Normalize
        # ----------------------------------------------------

        image_array = (
            image_array / 255.0
        )


        # ----------------------------------------------------
        # Batch dimension
        # ----------------------------------------------------

        input_image = np.expand_dims(
            image_array,
            axis=0
        )


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        prediction = model.predict(
            input_image,
            verbose=0
        )


        # ----------------------------------------------------
        # Remove dimensions
        # ----------------------------------------------------

        prediction = prediction.squeeze()


        # ----------------------------------------------------
        # Binary mask
        # ----------------------------------------------------

        threshold = 0.5

        binary_mask = (
            prediction > threshold
        ).astype(np.uint8)


        # ----------------------------------------------------
        # Mask image
        # ----------------------------------------------------

        mask_image = Image.fromarray(
            binary_mask * 255
        )


        # ----------------------------------------------------
        # Resize mask
        # ----------------------------------------------------

        mask_image = mask_image.resize(
            (
                original_width,
                original_height
            ),
            Image.Resampling.NEAREST
        )


        # ----------------------------------------------------
        # PNG
        # ----------------------------------------------------

        mask_buffer = io.BytesIO()

        mask_image.save(
            mask_buffer,
            format="PNG"
        )


        mask_base64 = base64.b64encode(
            mask_buffer.getvalue()
        ).decode("utf-8")


        # ----------------------------------------------------
        # Statistics
        # ----------------------------------------------------

        tumor_pixels = int(
            np.sum(binary_mask > 0)
        )


        total_pixels = int(
            binary_mask.size
        )


        tumor_percentage = (
            tumor_pixels /
            total_pixels
        ) * 100


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {

            "success": True,

            "mask":
                f"data:image/png;base64,"
                f"{mask_base64}",

            "tumor_pixels":
                tumor_pixels,

            "tumor_percentage":
                round(
                    tumor_percentage,
                    2
                ),

            "threshold":
                threshold,

            "message":
                "Tumor segmentation completed.",
        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Segmentation failed: {str(e)}"
            )
        )