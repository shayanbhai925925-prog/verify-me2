import io
import math
import os
import time
import torch
import numpy as np
from PIL import Image, ImageDraw
from transformers import AutoImageProcessor, AutoModelForImageClassification

MODEL_NAME = "capcheck/ai-human-generated-image-detection"

def generate_simple_test_image() -> Image.Image:
    """Generate a simple synthetic geometric test image."""
    img = Image.new("RGB", (224, 224), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 100, 100], fill=(255, 60, 60), outline=(0, 0, 0))
    draw.ellipse([110, 110, 200, 200], fill=(50, 120, 240), outline=(0, 0, 0))
    draw.line([0, 0, 224, 224], fill=(30, 200, 80), width=3)
    return img

def generate_photographic_texture_image() -> Image.Image:
    """Generate a textured gradient image simulating natural lighting and noise."""
    w, h = 300, 300
    # Generate multi-frequency wave and smooth noise texture
    x = np.linspace(0, 4 * np.pi, w)
    y = np.linspace(0, 4 * np.pi, h)
    xx, yy = np.meshgrid(x, y)
    r = (np.sin(xx) * np.cos(yy) * 64 + 128).astype(np.uint8)
    g = (np.cos(xx * 0.5) * np.sin(yy * 0.5) * 64 + 128).astype(np.uint8)
    b = ((np.sin(xx + yy) + 1) * 100).astype(np.uint8)
    rgb = np.stack([r, g, b], axis=-1)
    return Image.fromarray(rgb)

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"=== Running Step 5B Test ===")
    print(f"Target Device: {device}")
    print(f"Loading Model & Processor: {MODEL_NAME} ...")
    
    start_load = time.perf_counter()
    processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
    model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
    model.to(device)
    model.eval()
    load_duration = time.perf_counter() - start_load
    
    print(f"Model loaded successfully in {load_duration:.2f} seconds.")
    print(f"Model Labels (id2label): {model.config.id2label}")
    print()

    # Prepare test images
    test_cases = [
        ("Simple Generated Geometric Image", generate_simple_test_image()),
        ("Textured Gradient / Natural Pattern Image", generate_photographic_texture_image())
    ]

    for name, img in test_cases:
        print(f"--- Testing: {name} ({img.size[0]}x{img.size[1]}, mode={img.mode}) ---")
        
        # Preprocessing
        inputs = processor(images=img, return_tensors="pt").to(device)
        
        # Inference with timing
        t0 = time.perf_counter()
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=-1)[0]
        inference_time_ms = (time.perf_counter() - t0) * 1000.0

        predicted_class_id = int(torch.argmax(probs).item())
        predicted_label = model.config.id2label[predicted_class_id]
        confidence = float(probs[predicted_class_id].item())

        print(f"Inference Time: {inference_time_ms:.2f} ms")
        print(f"Predicted Class: '{predicted_label}' (id={predicted_class_id})")
        print(f"Confidence: {confidence * 100:.2f}%")
        print("Class Probabilities:")
        for idx, label in model.config.id2label.items():
            prob_val = float(probs[int(idx)].item())
            print(f"  - [{idx}] {label}: {prob_val * 100:.2f}% (raw: {prob_val:.6f})")
        print()

    print("=== Model Test Completed Successfully ===")

if __name__ == "__main__":
    main()
