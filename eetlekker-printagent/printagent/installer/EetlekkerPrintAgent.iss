; Inno Setup script for Eetlekker PrintAgent
; Produces a single-file installer: EetlekkerPrintAgent-Setup.exe
; Compile with Inno Setup 6 (https://jrsoftware.org/isdl.php) or via BUILD-INSTALLER.bat

#define MyAppName        "Eetlekker PrintAgent"
#define MyAppVersion     "1.0.0"
#define MyAppPublisher   "Eetlekker"
#define MyAppURL         "https://eetlekker.online"
#define MyAppExeName     "EetlekkerPrintAgent.exe"

[Setup]
AppId={{B6A1F3C2-4E2B-4D9F-9A11-EETLEKKERPOS01}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\Eetlekker PrintAgent
DefaultGroupName=Eetlekker PrintAgent
DisableProgramGroupPage=yes
OutputDir=..\dist-installer
OutputBaseFilename=EetlekkerPrintAgent-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";   Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "autostart";     Description: "Start &automatically when Windows starts"; GroupDescription: "Startup:"; Flags: checkedonce
Name: "firewall";      Description: "Allow through Windows Firewall (localhost only)"; GroupDescription: "Network:"; Flags: checkedonce

[Files]
; Main executable produced by `pkg`
Source: "..\dist\EetlekkerPrintAgent.exe"; DestDir: "{app}"; Flags: ignoreversion
; Cyrillic fonts kept next to the exe so they can be replaced without rebuilding
Source: "..\fonts\*"; DestDir: "{app}\fonts"; Flags: ignoreversion recursesubdirs
; Default config (only if it does not already exist — preserves user settings on upgrade)
Source: "..\config.json"; DestDir: "{app}"; Flags: onlyifdoesntexist uninsneveruninstall
; Readme
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Eetlekker PrintAgent";          Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Open Admin Page";               Filename: "http://127.0.0.1:7777"
Name: "{group}\Uninstall Eetlekker PrintAgent"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Eetlekker PrintAgent";  Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Auto-start at login (HKLM = all users)
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "EetlekkerPrintAgent"; \
  ValueData: """{app}\{#MyAppExeName}"""; \
  Flags: uninsdeletevalue; Tasks: autostart

[Run]
; Open firewall on localhost port 7777 (harmless even though we bind to 127.0.0.1)
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""Eetlekker PrintAgent"" dir=in action=allow protocol=TCP localport=7777 profile=any"; \
  Flags: runhidden; Tasks: firewall

; Launch app after install
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Eetlekker PrintAgent now"; \
  Flags: nowait postinstall skipifsilent

; Open admin page in default browser
Filename: "http://127.0.0.1:7777"; Description: "Open admin page"; \
  Flags: shellexec postinstall skipifsilent unchecked

[UninstallRun]
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""Eetlekker PrintAgent"""; Flags: runhidden
Filename: "taskkill"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden
