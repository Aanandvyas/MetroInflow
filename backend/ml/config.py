# --- API and Model Configuration ---
MODEL_API_URL = "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6"
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



# config.py

# --- API and Model Configuration ---
# HuggingFace API Configuration
# MODEL_API_URL = "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6"
# MAX_CHUNK_CHAR_LENGTH = 4000  # Max character length for each chunk
# MIN_TEXT_LENGTH = 100         # Minimum character length to attempt summarization

# # --- Summarization Model Parameters for HuggingFace ---
# # Parameters for summarizing individual chunks
# chunk_summary_params = {
#     "min_length": 50,
#     "max_length": 150,
#     "do_sample": False
# }

# # Parameters for final summary generation
# final_summary_params = {
#     "min_length": 150,
#     "max_length": 350,
#     "do_sample": False
# }