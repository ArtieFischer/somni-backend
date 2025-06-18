# Test Scripts Usage

## Available Scripts

### 1. single-test.sh
Tests a single dream (Family House with Animals & Hair Loss) with one or all interpreters.

```bash
# Test with all interpreters
./single-test.sh

# Test with specific interpreter
./single-test.sh jung
./single-test.sh freud
./single-test.sh neuroscientist
```

### 2. test-dreams.sh
Tests 5 casual/absurd dreams with one or all interpreters.

```bash
# Test all dreams with all interpreters
./test-dreams.sh

# Test all dreams with specific interpreter
./test-dreams.sh jung

# Test and save results to file
./test-dreams.sh jung results.txt
./test-dreams.sh "" complete-results.txt  # All interpreters
```

### 3. test-controversial-dreams.sh
Tests 7 controversial/edge case dreams with one or all interpreters.

```bash
# Test all controversial dreams with all interpreters
./test-controversial-dreams.sh

# Test with specific interpreter
./test-controversial-dreams.sh freud

# Test and save results to file
./test-controversial-dreams.sh freud controversial-results.txt
./test-controversial-dreams.sh "" all-controversial-results.txt  # All interpreters
```

## Dreams Included

### test-dreams.sh (5 dreams)
1. Family House with Animals & Hair Loss
2. Office Turned Into Jungle Gym
3. Unprepared for Weird Exam
4. Car That Keeps Changing
5. Celebrity Cooking Disaster

### test-controversial-dreams.sh (7 dreams)
1. Sexual Dream
2. Sexual Assault/Trauma Dream
3. Extreme Violence/Gore Dream
4. Infidelity/Cheating Dream
5. Regular Work Day Dream
6. Fun Skating with Sister Dream
7. House Escape Nightmare

## Output
- Results are displayed in the terminal with JSON formatting
- If output file is specified, results are saved to that file
- All scripts use the test API endpoint with proper authentication