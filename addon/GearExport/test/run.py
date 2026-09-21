"""Run the Lua 5.1 test suite via lupa (no system Lua interpreter needed)."""
import os, sys
sys.stdout.reconfigure(line_buffering=True)
from lupa import lua51
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
L = lua51.LuaRuntime()
L.globals().arg = L.table()
L.globals().arg[0] = 'test/run_tests.lua'
# Replace os.exit so a failure surfaces as a Python exit code.
L.execute('os.exit = function(code) error("__EXIT__" .. tostring(code), 0) end')
try:
    L.execute(open('test/run_tests.lua').read())
except Exception as e:
    msg = str(e)
    if '__EXIT__' not in msg:
        raise
    code = int(msg.split('__EXIT__')[1].strip().split()[0])
    if code != 0:
        sys.exit(code)
# Strict structural validation of the exported JSON with Python's parser.
import subprocess
out = subprocess.run([sys.executable, 'test/check_export.py', 'test/last_export.json'],
                     capture_output=True, text=True)
print(out.stdout.strip(), out.stderr.strip(), flush=True)
os.remove('test/last_export.json')
if 'PYCHECK_OK' not in out.stdout:
    print('FAIL  JSON structure check')
    sys.exit(1)
print('PASS  JSON structure check')
