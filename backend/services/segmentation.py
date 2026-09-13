import base64
import io
import os
import time

import numpy as np
import tensorflow as tf

from PIL import Image


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "..",
    "Training model",
    "brain_tumor_unet.keras",
)

IMAGE_SIZE = (256, 256)

SEGMENTATION_THRESHOLD = 0.5

MODEL_NAME = "brain_tumor_unet"

MODEL_VERSION = "1.0"


# ============================================================
# CUSTOM KERAS FUNCTIONS
# ============================================================

def dice_coefficient(
    y_true,
    y_pred,
    smooth=1e-6,
):

    y_true_f = tf.reshape(
        y_true,
        [-1],
    )

    y_pred_f = tf.reshape(
        y_pred,
        [-1],
    )

    intersection = tf.reduce_sum(
        y_true_f * y_pred_f
    )

    return (
        2.0 * intersection + smooth
    ) / (
        tf.reduce_sum(y_true_f)
        + tf.reduce_sum(y_pred_f)
        + smooth
    )


def dice_loss(
    y_true,
    y_pred,
):

    return 1.0 - dice_coefficient(
        y_true,
        y_pred,
    )


def combined_loss(
    y_true,
    y_pred,
):

    bce = tf.keras.losses.binary_crossentropy(
        y_true,
        y_pred,
    )

    return (
        bce
        + dice_loss(y_true, y_pred)
    )


# ============================================================
# LOAD TRAINED MODEL
# ============================================================

model = None

model_load_error = None


def load_segmentation_model():

    global model
    global model_load_error

    if model is not None:
        return model

    try:

        if not os.path.exists(MODEL_PATH):

            raise FileNotFoundError(
                f"Model not found: {MODEL_PATH}"
            )

        model = tf.keras.models.load_model(
            MODEL_PATH,
            custom_objects={
                "dice_coefficient": dice_coefficient,
                "dice_loss": dice_loss,
                "combined_loss": combined_loss,
            },
            compile=False,
        )

        model_load_error = None

        print(
            "Brain tumor U-Net model loaded successfully."
        )

        return model

    except Exception as exc:

        model_load_error = str(exc)

        print(
            f"Failed to load segmentation model: {exc}"
        )

        return None


# ============================================================
# MODEL STATUS
# ============================================================

def is_model_loaded() -> bool:

    return model is not None


def get_model_status():

    return {
        "model_loaded": is_model_loaded(),
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "model_path": MODEL_PATH,
        "error": model_load_error,
    }


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(
    image_bytes: bytes,
):

    image = Image.open(
        io.BytesIO(image_bytes)
    ).convert("RGB")

    original_width, original_height = (
        image.size
    )

    resized_image = image.resize(
        IMAGE_SIZE
    )

    image_array = np.asarray(
        resized_image,
        dtype=np.float32,
    )

    image_array = image_array / 255.0

    image_array = np.expand_dims(
        image_array,
        axis=0,
    )

    return (
        image_array,
        original_width,
        original_height,
    )


# ============================================================
# SEGMENTATION INFERENCE
# ============================================================

def segment_image(
    image_bytes: bytes,
):

    if model is None:

        raise RuntimeError(
            "Segmentation model is not loaded."
        )

    start_time = time.perf_counter()

    (
        image_array,
        original_width,
        original_height,
    ) = preprocess_image(
        image_bytes
    )

    prediction = model.predict(
        image_array,
        verbose=0,
    )

    prediction = np.squeeze(
        prediction
    )

    binary_mask = (
        prediction > SEGMENTATION_THRESHOLD
    ).astype(np.uint8)

    mask_image = Image.fromarray(
        binary_mask * 255
    )

    mask_image = mask_image.resize(
        (
            original_width,
            original_height,
        ),
        resample=Image.Resampling.NEAREST,
    )

    mask_array = np.asarray(
        mask_image
    )

    tumor_pixels = int(
        np.sum(mask_array > 0)
    )

    total_pixels = int(
        mask_array.size
    )

    tumor_percentage = (
        tumor_pixels / total_pixels * 100
        if total_pixels > 0
        else 0.0
    )

    mask_buffer = io.BytesIO()

    mask_image.save(
        mask_buffer,
        format="PNG",
    )

    mask_base64 = base64.b64encode(
        mask_buffer.getvalue()
    ).decode("utf-8")

    processing_time_ms = (
        time.perf_counter() - start_time
    ) * 1000

    return {
        "success": True,

        "mask": (
            "data:image/png;base64,"
            + mask_base64
        ),

        "tumor_pixels": tumor_pixels,

        "tumor_percentage": round(
            tumor_percentage,
            2,
        ),

        "threshold": SEGMENTATION_THRESHOLD,

        "model_name": MODEL_NAME,

        "model_version": MODEL_VERSION,

        "processing_time_ms": round(
            processing_time_ms,
            2,
        ),

        "message": (
            "Tumor segmentation completed."
        ),
    }


# ============================================================
# LOAD MODEL ON IMPORT
# ============================================================

load_segmentation_model()