# gunicorn.conf.py
#  Gunicorn configuration file

#Windows pe nhi chlta ye  chutiya

import multiprocessing

# The socket to bind to
bind = "0.0.0.0:8000"

# The number of worker processes. 
# This is the most important setting for concurrency.
workers = multiprocessing.cpu_count() * 2 + 1

# The type of worker to use. `gevent` is excellent for apps
# that wait for network requests (like our API call to Hugging Face).
worker_class = "gevent"

# Worker timeout in seconds.
timeout = 120 

# Logging
accesslog = "-"
errorlog = "-"