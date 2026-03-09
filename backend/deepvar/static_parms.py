# DeepVaR configuration for AlphaVision integration
# Adapted from: https://github.com/giorgosfatouros/DeepVaR (extra branch)

EPOCHS = 200
LRATE = 0.0001
FREQ = "1D"
PREDICTION_LENGTH = 1
CONTEXT_LENGTH = 15
START_DAY = '2018-01-01'
NUM_LAYERS = 2
DROPOUT = 0.1
CELL_TYPE = 'lstm'
N_CELLS = 100
USE_FT = True

# Path to price data (relative to backend/)
path = "data/sp100_daily_prices.csv"

# Train/Val/Test split
NUMBER_OF_TEST = 365       # ~15% — last year for testing
NUMBER_OF_VAL = 365        # ~15% — previous year for validation
NUMBER_OF_TRAIN = 1098     # ~70% — remaining data for training

# Results directory
RESULTS_DIR = "data/deepvar_results"
