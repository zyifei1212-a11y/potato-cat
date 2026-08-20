#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> bool {
    use tauri::Manager;

    let Some(window) = app.get_webview_window("main") else {
        return false;
    };

    let _ = window.unminimize();
    window.show().is_ok() && window.set_focus().is_ok()
}

#[tauri::command]
fn is_primary_mouse_button_pressed() -> bool {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
        return (GetAsyncKeyState(VK_LBUTTON as i32) as u16 & 0x8000) != 0;
    }

    #[cfg(not(target_os = "windows"))]
    false
}

#[tauri::command]
fn resize_pet_window(app: tauri::AppHandle, scale: f64) -> bool {
    use tauri::{LogicalSize, Manager, Size};

    let Some(window) = app.get_webview_window("pet") else {
        return false;
    };
    let safe_scale = scale.clamp(0.45, 1.3);
    let width = (370.0 * safe_scale).ceil();
    let height = (372.0 * safe_scale).ceil();
    window
        .set_size(Size::Logical(LogicalSize::new(width, height)))
        .is_ok()
}

#[tauri::command]
fn set_shortcut_icon(app: tauri::AppHandle, style: String) -> Result<usize, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        use tauri::Manager;

        let icon_file = match style.as_str() {
            "meimeiGreen" => "meimei-green.ico",
            "classic" => "classic.ico",
            _ => return Err("unknown app icon style".into()),
        };
        let icon_path = app
            .path()
            .resource_dir()
            .map_err(|error| error.to_string())?
            .join("resources")
            .join("app-icons")
            .join(icon_file);
        if !icon_path.is_file() {
            return Err(format!("bundled icon not found: {}", icon_path.display()));
        }

        let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;
        let script = r#"
$targetExe = [Environment]::GetEnvironmentVariable('CAT_POMODORO_TARGET_EXE')
$iconPath = [Environment]::GetEnvironmentVariable('CAT_POMODORO_ICON_PATH')
$shell = New-Object -ComObject WScript.Shell
$count = 0
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('Programs')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
foreach ($root in $roots) {
  Get-ChildItem -LiteralPath $root -Filter '*.lnk' -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $shortcut = $shell.CreateShortcut($_.FullName)
      if ($shortcut.TargetPath -and [String]::Equals(
        [IO.Path]::GetFullPath($shortcut.TargetPath),
        [IO.Path]::GetFullPath($targetExe),
        [StringComparison]::OrdinalIgnoreCase
      )) {
        $shortcut.IconLocation = $iconPath + ',0'
        $shortcut.Save()
        $count++
      }
    } catch {}
  }
}
Write-Output $count
"#;

        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let output = Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script])
            .env("CAT_POMODORO_TARGET_EXE", &current_exe)
            .env("CAT_POMODORO_ICON_PATH", &icon_path)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|error| error.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        let count = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| line.trim().parse::<usize>().ok())
            .last()
            .unwrap_or(0);
        return Ok(count);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, style);
        Ok(0)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            quit_app,
            show_main_window,
            is_primary_mouse_button_pressed,
            resize_pet_window,
            set_shortcut_icon
        ])
        .run(tauri::generate_context!())
        .expect("error while running cat pomodoro");
}
