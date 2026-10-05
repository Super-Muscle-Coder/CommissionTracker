# Test fixture (never used by the Main): "the person is working in another
# application". A separate PowerShell process with a small WinForms window.
# It answers one line on stdout per command line on stdin:
#   grab -> takes the foreground, answers "grabbed"
#   fg   -> answers "fg <pid>" with the process that owns the foreground window
#   quit -> ends
# A window of the Electron process under test could not play this part:
# Windows lets a process move its own windows to the front more freely than
# another process's (same reasoning as UI/tests/tools/ui18_probe.mjs).
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class CtWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@
$f = New-Object System.Windows.Forms.Form
$f.Text = 'ct-desktop-test-other-application'
$f.Width = 320
$f.Height = 140
$f.StartPosition = 'Manual'
$f.Location = New-Object System.Drawing.Point(40, 40)
$f.Show()
[Console]::Out.WriteLine("ready $PID")
while (($line = [Console]::In.ReadLine()) -ne $null) {
  [System.Windows.Forms.Application]::DoEvents()
  if ($line -eq 'grab') {
    $f.WindowState = 'Normal'
    $f.Activate()
    [void][CtWin]::SetForegroundWindow($f.Handle)
    [System.Windows.Forms.Application]::DoEvents()
    [Console]::Out.WriteLine('grabbed')
  } elseif ($line -eq 'fg') {
    $p = 0
    [void][CtWin]::GetWindowThreadProcessId([CtWin]::GetForegroundWindow(), [ref]$p)
    [Console]::Out.WriteLine("fg $p")
  } elseif ($line -eq 'quit') { break }
}
$f.Close()
