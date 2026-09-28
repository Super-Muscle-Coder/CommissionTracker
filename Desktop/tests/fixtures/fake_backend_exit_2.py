"""Fake backend for desktop tests: exits with code 2 without writing READY
(like the real backend when a launch value is missing or malformed)."""
import sys

sys.stderr.write("fake backend: exiting with code 2, no READY\n")
sys.exit(2)
