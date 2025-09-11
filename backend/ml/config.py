

# --- API and Model Configuration ---
MODEL_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
MAX_CHUNK_CHAR_LENGTH = 1000 # Max character length for each chunk
MIN_TEXT_LENGTH = 200      # Minimum character length to attempt summarization

# --- Summarization Model Parameters ---
final_summary_params = {
    "min_length": 150,
    "max_length": 350,
    "do_sample": False
}
chunk_summary_params = {
    "min_length": 50,
    "max_length": 150,
    "do_sample": False
}