' Photo Studio launcher (Windows). Double-click this file to use it.
' It starts the local photo editor in the background (no console window) and
' opens it in your browser. The editor stops by itself when you close the tab.
Option Explicit

Dim shell, fso, root, logFile, port, i
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' This file sits next to package.json, so the project is the folder holding it.
root = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root
logFile = shell.ExpandEnvironmentStrings("%TEMP%") & "\PhotoStudio.log"
port = shell.ExpandEnvironmentStrings("%PHOTO_PORT%")
If port = "%PHOTO_PORT%" Then port = "4322"

Sub Fail(message)
  MsgBox message, 48, "Photo Studio"
  WScript.Quit 1
End Sub

If shell.Run("cmd /c where node >nul 2>nul", 0, True) <> 0 Then
  Fail "Photo Studio needs Node.js, which is not installed on this computer. Install it from nodejs.org, then open Photo Studio again."
End If

' First run on a new computer: download the project's tools once.
If Not fso.FolderExists(root & "\node_modules") Then
  MsgBox "Photo Studio will set itself up for the first time. This takes about a minute. Click OK, then wait for it to open.", 64, "Photo Studio"
  If shell.Run("cmd /c npm install --no-audit --no-fund >> """ & logFile & """ 2>&1", 0, True) <> 0 Then
    Fail "First-time setup failed. Check your internet connection and try again. Details: " & logFile
  End If
End If

shell.Run "cmd /c node tools\photo-studio\main.mjs >> """ & logFile & """ 2>&1", 0, False

' Wait until the editor answers (the server itself opens the browser).
For i = 1 To 30
  WScript.Sleep 500
  If shell.Run("cmd /c curl -fs --max-time 1 http://127.0.0.1:" & port & "/api/state >nul 2>nul", 0, True) = 0 Then WScript.Quit 0
Next
Fail "Photo Studio could not start. Details are in: " & logFile
