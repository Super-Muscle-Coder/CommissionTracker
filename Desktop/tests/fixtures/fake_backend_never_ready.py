"""Fake backend for desktop tests: never writes READY and ignores stdin."""
import sys
import time

sys.stderr.write("fake backend: never ready\n")
sys.stderr.flush()
while True:
    time.sleep(1)
