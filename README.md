# WavePaintSim

WavePaintSim is a local WavePaint-based waveform editor plus Verilog simulation bridge.

## Highlights

- Hand-draw stimulus waveforms in the same canvas
- Use the drawn waveforms as testbench input
- Run Verilog simulation and render results back into the same waveform view
- Offline Windows build with a self-contained `WavePaint.exe`

## Status

- Stimulus seed: `clk`, `rst_n`, `en`
- Simulation result injection: enabled
- TB preview and copy: enabled

## Run

1. Open `WavePaint.exe`
2. Click `Sim`
3. View stimulus and result waves in the waveform canvas

## Build

```powershell
./build.ps1
```

## Repository Layout

- `index.html` main app shell
- `js/` app, waveform, and simulation logic
- `css/` UI styles
- `img/` icons and artwork
- `lib/` local WaveDrom assets
- `WavePaint.exe` packaged Windows launcher

## Docs

- [CHANGELOG](CHANGELOG.md)
- [CONTRIBUTING](CONTRIBUTING.md)
- [SECURITY](SECURITY.md)
- [Architecture](docs/architecture.md)
- [Release Notes](docs/release-notes/v0.1.0.md)
