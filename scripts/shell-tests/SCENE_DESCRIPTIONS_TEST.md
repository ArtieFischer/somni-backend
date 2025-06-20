# Scene Description Test Script

This script tests the scene description generation functionality by processing all controversial dreams from the test suite.

## Usage

Run the script from the shell-tests directory:

```bash
cd scripts/shell-tests
./test-scene-descriptions.sh
```

Or run it from the project root:

```bash
./scripts/shell-tests/test-scene-descriptions.sh
```

## Prerequisites

1. The backend server must be running on `http://localhost:3000`
2. You need `curl` and `jq` installed
3. The script uses the API secret from the test environment

## What it does

1. Reads all 7 controversial dreams from the test suite
2. Sends each dream to the `/api/v1/scene-description` endpoint
3. Generates a visual scene description for each dream
4. Saves all results to a timestamped file: `scene-descriptions-YYYYMMDD_HHMMSS.txt`

## Output

The script creates a text file containing:
- Original dream transcription
- Generated scene description
- Metadata about the generation

Example output filename: `scene-descriptions-20250620_143022.txt`

## Dreams tested

1. Sexual Dream
2. Sexual Assault/Trauma Dream
3. Extreme Violence/Gore Dream
4. Infidelity/Cheating Dream
5. Regular Work Day Dream
6. Fun Skating with Sister Dream
7. House Escape Nightmare

## Note

The scene descriptions are generated to be:
- Visual only (no symbolism or interpretation)
- Suitable for image generation
- Focused on what can be seen (colors, objects, environment, lighting)