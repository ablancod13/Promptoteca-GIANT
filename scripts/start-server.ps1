$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "D:\Documents\Repositorio GIANT"
$env:CI = "true"

& "C:\Users\andre\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" `
  "D:\Documents\Repositorio GIANT\node_modules\next\dist\bin\next" `
  start `
  --hostname 127.0.0.1 `
  --port 3000 *>&1 | Tee-Object -FilePath "D:\Documents\Repositorio GIANT\server.combined.log"
