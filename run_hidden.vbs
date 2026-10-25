Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\ASUS\Downloads\Nhap bao cao Shotblast"
WshShell.Run "node server.js", 0, False
