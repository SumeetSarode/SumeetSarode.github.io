' Portfolio Preview launcher (Windows). Double-click this file to use it.
' It builds your site and opens it in your browser with a status bar (no console
' window), updating it whenever you save a content file. It stops by itself when
' you close the tab.
Option Explicit

Dim shell, fso, root, logFile, port, i
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' This file sits next to package.json, so the project is the folder holding it.
root = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root
logFile = shell.ExpandEnvironmentStrings("%TEMP%") & "\PortfolioPreview.log"
port = shell.ExpandEnvironmentStrings("%PREVIEW_PORT%")
If port = "%PREVIEW_PORT%" Then port = "4323"

Sub Fail(message)
  MsgBox message, 48, "Portfolio Preview"
  WScript.Quit 1
End Sub

If shell.Run("cmd /c where node >nul 2>nul", 0, True) <> 0 Then
  Fail "Portfolio Preview needs Node.js, which is not installed on this computer. Install it from nodejs.org, then open Portfolio Preview again."
End If

' First run on a new computer: download the project's tools once.
If Not fso.FolderExists(root & "\node_modules") Then
  MsgBox "Portfolio Preview will set itself up for the first time. This takes about a minute. Click OK, then wait for it to open.", 64, "Portfolio Preview"
  If shell.Run("cmd /c npm install --no-audit --no-fund >> """ & logFile & """ 2>&1", 0, True) <> 0 Then
    Fail "First-time setup failed. Check your internet connection and try again. Details: " & logFile
  End If
End If

shell.Run "cmd /c node tools\portfolio-preview\main.mjs >> """ & logFile & """ 2>&1", 0, False

' Wait until the preview answers (the server itself opens the browser).
For i = 1 To 30
  WScript.Sleep 500
  If shell.Run("cmd /c curl -fs --max-time 1 http://127.0.0.1:" & port & "/__preview/api/state >nul 2>nul", 0, True) = 0 Then WScript.Quit 0
Next
Fail "Portfolio Preview could not start. Details are in: " & logFile
