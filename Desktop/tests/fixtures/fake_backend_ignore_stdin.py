"""Fake backend for desktop tests: writes READY, then ignores the closing of
its standard input and never exits on its own."""
import sys
import time

# Written in two chunks to exercise line assembly in the desktop Main.
sys.stdout.buffer.write(b"REA")
sys.stdout.buffer.flush()
time.sleep(0.2)
sys.stdout.buffer.write(b"DY\r\n")
sys.stdout.buffer.flush()
while True:
    time.sleep(1)
