$ErrorActionPreference = "Stop"

$workspace = "D:\Documents\Repositorio GIANT"
$node = "C:\Users\andre\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$next = Join-Path $workspace "node_modules\next\dist\bin\next"
$log = Join-Path $workspace "server.combined.log"

Set-Location -LiteralPath $workspace
$env:CI = "true"
Set-Content -LiteralPath $log -Value "" -Encoding UTF8

$psi = [System.Diagnostics.ProcessStartInfo]::new()
$psi.FileName = $node
$psi.Arguments = '"' + $next + '" start --hostname 127.0.0.1 --port 3000'
$psi.WorkingDirectory = $workspace
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true

$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $psi
$process.EnableRaisingEvents = $true

Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action {
  if ($EventArgs.Data) {
    Add-Content -LiteralPath "D:\Documents\Repositorio GIANT\server.combined.log" -Value $EventArgs.Data
  }
} | Out-Null

Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action {
  if ($EventArgs.Data) {
    Add-Content -LiteralPath "D:\Documents\Repositorio GIANT\server.combined.log" -Value $EventArgs.Data
  }
} | Out-Null

$null = $process.Start()
$process.BeginOutputReadLine()
$process.BeginErrorReadLine()

while (-not $process.HasExited) {
  Start-Sleep -Seconds 5
}
