param(
  [string]$Source = (Join-Path $PSScriptRoot '..\assets\brand\profu\professor-pythagoras-chroma.png')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = (Resolve-Path $Source).Path
$brandDir = Join-Path $projectRoot 'assets\brand\profu'
$androidRes = Join-Path $projectRoot 'android\app\src\main\res'

function New-ArgbBitmap([int]$width, [int]$height) {
  return [System.Drawing.Bitmap]::new(
    $width,
    $height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
}

function Save-Png([System.Drawing.Image]$image, [string]$path) {
  $directory = Split-Path -Parent $path
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
  $image.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-Graphics([System.Drawing.Image]$target) {
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  return $graphics
}

function Remove-ChromaKey([string]$path) {
  $source = [System.Drawing.Bitmap]::FromFile($path)
  try {
    $result = New-ArgbBitmap $source.Width $source.Height
    $graphics = New-Graphics $result
    try {
      $graphics.DrawImageUnscaled($source, 0, 0)
    } finally {
      $graphics.Dispose()
    }

    $rect = [System.Drawing.Rectangle]::new(0, 0, $result.Width, $result.Height)
    $data = $result.LockBits(
      $rect,
      [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    try {
      $bytes = [byte[]]::new($data.Stride * $data.Height)
      [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

      for ($y = 0; $y -lt $data.Height; $y++) {
        $row = $y * $data.Stride
        for ($x = 0; $x -lt $data.Width; $x++) {
          $i = $row + ($x * 4)
          $blue = [int]$bytes[$i]
          $green = [int]$bytes[$i + 1]
          $red = [int]$bytes[$i + 2]
          $dominance = $green - [Math]::Max($red, $blue)

          if ($green -gt 125 -and $dominance -ge 78) {
            $alpha = 0
          } elseif ($green -gt 100 -and $dominance -gt 30) {
            $alpha = [Math]::Round(255 * (78 - $dominance) / 48)
            $alpha = [Math]::Max(0, [Math]::Min(255, $alpha))
          } else {
            $alpha = 255
          }

          if ($alpha -gt 0 -and $alpha -lt 255) {
            $bytes[$i + 1] = [byte][Math]::Min($green, [Math]::Max($red, $blue) + 8)
          }
          $bytes[$i + 3] = [byte]$alpha
        }
      }

      [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    } finally {
      $result.UnlockBits($data)
    }
    return $result
  } finally {
    $source.Dispose()
  }
}

function Draw-Scaled(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Image]$image,
  [int]$x,
  [int]$y,
  [int]$width,
  [int]$height
) {
  $destination = [System.Drawing.Rectangle]::new($x, $y, $width, $height)
  $sourceRect = [System.Drawing.Rectangle]::new(0, 0, $image.Width, $image.Height)
  $graphics.DrawImage($image, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
}

function New-NotebookBackground([int]$size) {
  $image = New-ArgbBitmap $size $size
  $graphics = New-Graphics $image
  try {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#F6C953'))

    $haloBrush = [System.Drawing.SolidBrush]::new(
      [System.Drawing.Color]::FromArgb(145, 255, 235, 170)
    )
    $graphics.FillEllipse($haloBrush, $size * 0.12, $size * 0.12, $size * 0.76, $size * 0.76)
    $haloBrush.Dispose()

    $pen = [System.Drawing.Pen]::new(
      [System.Drawing.Color]::FromArgb(35, 25, 49, 73),
      [Math]::Max(2, $size * 0.009)
    )
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $m = $size * 0.08
    $d = $size * 0.07
    $graphics.DrawLine($pen, $m, $m + $d / 2, $m + $d, $m + $d / 2)
    $graphics.DrawLine($pen, $m + $d / 2, $m, $m + $d / 2, $m + $d)
    $graphics.DrawEllipse($pen, $size * 0.83, $size * 0.10, $d, $d)
    $graphics.DrawLine($pen, $size * 0.84, $size * 0.86, $size * 0.91, $size * 0.86)
    $graphics.DrawLine($pen, $size * 0.875, $size * 0.825, $size * 0.875, $size * 0.895)
    $pen.Dispose()
  } finally {
    $graphics.Dispose()
  }
  return $image
}

function New-Composite(
  [System.Drawing.Image]$mascot,
  [int]$size,
  [bool]$transparent,
  [double]$scale
) {
  $image = if ($transparent) { New-ArgbBitmap $size $size } else { New-NotebookBackground $size }
  $graphics = New-Graphics $image
  try {
    if ($transparent) {
      $graphics.Clear([System.Drawing.Color]::Transparent)
    }
    $drawSize = [int]($size * $scale)
    $offset = [int](($size - $drawSize) / 2)
    Draw-Scaled $graphics $mascot $offset $offset $drawSize $drawSize
  } finally {
    $graphics.Dispose()
  }
  return $image
}

function New-Avatar([System.Drawing.Image]$mascot, [int]$size) {
  $image = New-ArgbBitmap $size $size
  $graphics = New-Graphics $image
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $destination = [System.Drawing.Rectangle]::new(12, 12, $size - 24, $size - 24)
    $sourceRect = [System.Drawing.Rectangle]::new(80, 35, 500, 500)
    $graphics.DrawImage($mascot, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  } finally {
    $graphics.Dispose()
  }
  return $image
}

function New-Monochrome([System.Drawing.Image]$foreground) {
  $image = New-ArgbBitmap $foreground.Width $foreground.Height
  $graphics = New-Graphics $image
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImageUnscaled($foreground, 0, 0)
  } finally {
    $graphics.Dispose()
  }

  $rect = [System.Drawing.Rectangle]::new(0, 0, $image.Width, $image.Height)
  $data = $image.LockBits(
    $rect,
    [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  try {
    $bytes = [byte[]]::new($data.Stride * $data.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    for ($i = 0; $i -lt $bytes.Length; $i += 4) {
      $bytes[$i] = 255
      $bytes[$i + 1] = 255
      $bytes[$i + 2] = 255
    }
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  } finally {
    $image.UnlockBits($data)
  }
  return $image
}

function Resize-Image(
  [System.Drawing.Image]$source,
  [int]$width,
  [int]$height,
  [string]$backgroundColor = ''
) {
  $image = New-ArgbBitmap $width $height
  $graphics = New-Graphics $image
  try {
    $clearColor = if ($backgroundColor) {
      [System.Drawing.ColorTranslator]::FromHtml($backgroundColor)
    } else {
      [System.Drawing.Color]::Transparent
    }
    $graphics.Clear($clearColor)
    Draw-Scaled $graphics $source 0 0 $width $height
  } finally {
    $graphics.Dispose()
  }
  return $image
}

$mascot = Remove-ChromaKey $sourcePath
try {
  Save-Png $mascot (Join-Path $brandDir 'professor-pythagoras.png')

  $avatar = New-Avatar $mascot 512
  # Keep the complete professor-and-board logo visible. The legacy/store icon
  # gets comfortable rounded-square padding, while the adaptive foreground is
  # smaller so Android's circle and squircle masks never clip the artwork.
  $icon = New-Composite $mascot 1024 $false 0.84
  $roundIcon = New-Composite $mascot 1024 $false 0.70
  $foreground = New-Composite $mascot 1024 $true 0.58
  $background = New-NotebookBackground 1024
  $monochrome = New-Monochrome $foreground
  $splash = New-Composite $mascot 1024 $true 0.78
  try {
    Save-Png $avatar (Join-Path $brandDir 'professor-avatar.png')
    Save-Png $icon (Join-Path $projectRoot 'assets\profu-icon.png')
    Save-Png $foreground (Join-Path $projectRoot 'assets\profu-android-foreground.png')
    Save-Png $background (Join-Path $projectRoot 'assets\profu-android-background.png')
    Save-Png $monochrome (Join-Path $projectRoot 'assets\profu-android-monochrome.png')
    Save-Png $splash (Join-Path $projectRoot 'assets\profu-splash-icon.png')

    $favicon = Resize-Image $icon 128 128 '#F6C953'
    $storeIcon = Resize-Image $icon 512 512 '#F6C953'
    try {
      Save-Png $favicon (Join-Path $projectRoot 'assets\profu-favicon.png')
      Save-Png $storeIcon (Join-Path $projectRoot 'assets\store\profu-play-icon-512.png')
    } finally {
      $favicon.Dispose()
      $storeIcon.Dispose()
    }

    $densities = @{
      'mdpi' = @{ legacy = 48; adaptive = 108; splash = 288 }
      'hdpi' = @{ legacy = 72; adaptive = 162; splash = 432 }
      'xhdpi' = @{ legacy = 96; adaptive = 216; splash = 576 }
      'xxhdpi' = @{ legacy = 144; adaptive = 324; splash = 864 }
      'xxxhdpi' = @{ legacy = 192; adaptive = 432; splash = 1152 }
    }

    foreach ($density in $densities.Keys) {
      $sizes = $densities[$density]
      $mipmap = Join-Path $androidRes "mipmap-$density"
      $drawable = Join-Path $androidRes "drawable-$density"

      $legacy = Resize-Image $icon $sizes.legacy $sizes.legacy '#F6C953'
      $legacyRound = Resize-Image $roundIcon $sizes.legacy $sizes.legacy '#F6C953'
      $adaptiveForeground = Resize-Image $foreground $sizes.adaptive $sizes.adaptive
      $adaptiveBackground = Resize-Image $background $sizes.adaptive $sizes.adaptive '#F6C953'
      $adaptiveMonochrome = Resize-Image $monochrome $sizes.adaptive $sizes.adaptive
      $splashLogo = Resize-Image $splash $sizes.splash $sizes.splash
      try {
        Save-Png $legacy (Join-Path $mipmap 'ic_launcher.png')
        Save-Png $legacyRound (Join-Path $mipmap 'ic_launcher_round.png')
        Save-Png $adaptiveForeground (Join-Path $mipmap 'ic_launcher_foreground.png')
        Save-Png $adaptiveBackground (Join-Path $mipmap 'ic_launcher_background.png')
        Save-Png $adaptiveMonochrome (Join-Path $mipmap 'ic_launcher_monochrome.png')
        Save-Png $splashLogo (Join-Path $drawable 'splashscreen_logo.png')
      } finally {
        $legacy.Dispose()
        $legacyRound.Dispose()
        $adaptiveForeground.Dispose()
        $adaptiveBackground.Dispose()
        $adaptiveMonochrome.Dispose()
        $splashLogo.Dispose()
      }
    }
  } finally {
    $avatar.Dispose()
    $icon.Dispose()
    $roundIcon.Dispose()
    $foreground.Dispose()
    $background.Dispose()
    $monochrome.Dispose()
    $splash.Dispose()
  }
} finally {
  $mascot.Dispose()
}

Write-Output 'Built Profu de Mate brand assets and Android launcher resources.'
