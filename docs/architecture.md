# Architecture

WavePaintSim has three main layers:

1. WavePaint UI layer for drawing and editing waveforms
2. Simulation layer for generating TB and parsing VCD output
3. Bridge layer for mapping SIM results back into the same waveform model

## Key Goal

Stimulus and result signals must live in one waveform canvas, with editability determined by signal role.
