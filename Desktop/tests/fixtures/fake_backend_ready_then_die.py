"""Fake backend for desktop tests: writes READY, then dies with code 3."""
import sys
import time

sys.stdout.buffer.write(b"READY\n")
sys.stdout.buffer.flush()
time.sleep(2)
sys.stderr.write("fake backend: dying with code 3\n")
sys.exit(3)
