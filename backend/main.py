from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import pandas as pd
import json
import numpy as np
from datetime import datetime, timedelta
import os
from pathlib import Path
from scipy import stats
import warnings
warnings.filterwarnings('ignore')
import requests
import asyncio
import httpx

# Configuration: Rolling window size for VaR backtesting (default: 252 trading days = 1 year)
VAR_ROLLING_WINDOW_DAYS = int(os.getenv('VAR_ROLLING_WINDOW_DAYS', '252'))

# Initialize FastAPI app
app = FastAPI(
    title="AlphaVision API",
    description="Financial Risk Analytics Backend API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081", "http://127.0.0.1:8080", "http://127.0.0.1:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class NewsItem(BaseModel):
    date: str
    title: str
    publisher: str
    content: str
    link: str
    symbols: List[str]
    sentiment: float

class StockInfo(BaseModel):
    ticker: str
    name: str
    sector: str
    price: float
    marketCap: float
    priceHistory: List[Dict[str, Any]]
    metrics: Dict[str, float]

class PortfolioMetrics(BaseModel):
    parametricVaR95: float
    monteCarloVaR95: float
    deepVaR95: float
    parametricVaR99: float
    monteCarloVaR99: float
    deepVaR99: float
    returns: float
    volatility: float
    sharpeRatio: float

class PortfolioRequest(BaseModel):
    selected_assets: List[str]
    weights: Dict[str, float]

class PortfolioPriceHistoryRequest(BaseModel):
    selected_assets: List[str]
    weights: Dict[str, float]
    days: int = 30

class PortfolioVaRTimeSeriesRequest(BaseModel):
    selected_assets: List[str]
    weights: Dict[str, float]
    days: int = None
    rolling_window: int = None

# Global data storage
price_data = None
news_data = None
stock_info = {}
# Pre-calculated VaR time-series for all assets (key: ticker, value: dict with rolling_window as key)
var_timeseries_cache = {}

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# VaR Service endpoints configuration
BLNN_VAR_API_URL = os.getenv("BLNN_VAR_API_URL", "")
DEEP_VAR_API_URL = os.getenv("DEEP_VAR_API_URL", "")
VAR_API_TIMEOUT = float(os.getenv("VAR_API_TIMEOUT", "5.0"))  # Timeout in seconds

def generate_xai_insights(title: str, content: str, sentiment: float, lime_words: List[Dict[str, Any]]) -> str:
    """
    Generate human-centric XAI insights using OpenAI GPT
    """
    if not OPENAI_API_KEY:
        return "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
    
    try:
        # Prepare the prompt for GPT
        top_words = sorted(lime_words, key=lambda x: abs(x['limeValue']), reverse=True)[:10]
        word_analysis = "\n".join([
            f"- '{word['word']}': {word['limeValue']:.3f} (importance: {word['importance']:.2f})"
            for word in top_words
        ])
        
        prompt = f"""
        As a financial analyst, provide human-centric insights about this news article's sentiment analysis:

        Article Title: {title}
        Overall Sentiment Score: {sentiment:.3f}
        
        Top 10 Most Influential Words and Their XAI Values:
        {word_analysis}

        Please provide:
        1. A brief explanation of why this article has this sentiment score
        2. Key factors that contributed to the sentiment (positive/negative/neutral)
        3. Market implications based on the sentiment
        4. What investors should pay attention to
        5. Any potential risks or opportunities highlighted

        Keep the response concise, professional, and focused on actionable insights for financial decision-making.
        """

        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a financial analyst specializing in sentiment analysis and market insights. Provide clear, actionable insights based on news sentiment data."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        response = requests.post(OPENAI_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result['choices'][0]['message']['content'].strip()
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return f"Unable to generate AI insights. Error: {str(e)}"

def calculate_parametric_var(returns: pd.Series, confidence_level: float = 0.95) -> float:
    """
    Calculate Parametric VaR using normal distribution assumption (RiskMetrics approach)
    Matches reference implementation exactly
    
    Args:
        returns: Series of daily returns
        confidence_level: VaR confidence level (0.95 for 95%, 0.99 for 99%)
    
    Returns:
        VaR as a percentage (negative number representing loss)
    """
    if len(returns) < 30:  # Need sufficient data
        return 0.0
    
    # Calculate mean and standard deviation
    mean_return = returns.mean()
    volatility = returns.std()
    
    # Z-score for confidence level
    # For 95% confidence: z_score = norm.ppf(0.05) ≈ -1.645 (negative for lower tail)
    z_score = stats.norm.ppf(1 - confidence_level)
    
    # VaR formula (exactly as in reference): VaR = -1 * (mean + z_score * volatility)
    # This gives positive value representing loss magnitude
    # For 95%: VaR = -(mean + (-1.645) * sigma) = -(mean - 1.645*sigma) = -mean + 1.645*sigma
    var_positive = -(mean_return + z_score * volatility)
    
    # Return as negative percentage (representing loss, matching user requirement for "down level")
    return -var_positive * 100

def calculate_monte_carlo_var(returns: pd.Series, confidence_level: float = 0.95, 
                            n_simulations: int = 1000) -> float:
    """
    Calculate Monte Carlo VaR using simulation (RiskMetrics approach)
    
    Args:
        returns: Series of daily returns
        confidence_level: VaR confidence level
        n_simulations: Number of Monte Carlo simulations
    
    Returns:
        VaR as a percentage (negative number representing loss)
    """
    if len(returns) < 30:
        return 0.0
    
    # Calculate parameters from historical returns
    mean_return = returns.mean()
    volatility = returns.std()
    
    # Simulate future returns using normal distribution
    # Using fewer simulations (1000 instead of 10000) to show more variation from Parametric VaR
    # This introduces sampling error which makes the difference more visible
    # Note: Using a seed based on the data itself to ensure reproducibility
    # while still allowing variation between different datasets
    seed_value = int(abs(hash(str(returns.iloc[-10:].values.tobytes()))) % 10000)
    np.random.seed(seed_value)
    simulated_returns = np.random.normal(mean_return, volatility, n_simulations)
    
    # VaR is the percentile (exactly as in reference)
    # For 95% confidence: get 5th percentile (worst 5% of outcomes)
    var_percentile = (1 - confidence_level) * 100
    var_positive = -np.percentile(simulated_returns, var_percentile)
    
    # Return as negative percentage (representing loss, matching user requirement for "down level")
    # Note: With 1000 simulations, there will be more visible variation from Parametric VaR
    # due to sampling error, which helps distinguish the two methods
    return -var_positive * 100

async def fetch_deep_var(ticker: str, returns: pd.Series, confidence_level: float = 0.95) -> Optional[float]:
    """
    Fetch Deep VaR from external API endpoint
    
    Args:
        ticker: Stock ticker symbol
        returns: Series of daily returns
        confidence_level: VaR confidence level (0.95 for 95%, 0.99 for 99%)
    
    Returns:
        VaR as a percentage, or None if endpoint is unavailable
    """
    if not DEEP_VAR_API_URL:
        return None
    
    try:
        # Prepare request data
        returns_list = returns.tolist()
        request_data = {
            "ticker": ticker,
            "returns": returns_list,
            "confidence_level": confidence_level,
            "lookback_days": len(returns)
        }
        
        async with httpx.AsyncClient(timeout=VAR_API_TIMEOUT) as client:
            response = await client.post(
                f"{DEEP_VAR_API_URL}/calculate-var",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract VaR value (adjust based on actual API response structure)
            var_value = result.get("var", result.get("deepVaR", None))
            if var_value is not None:
                return float(var_value) * 100  # Convert to percentage if needed
            return None
            
    except Exception as e:
        print(f"Deep VaR API error for {ticker}: {e}")
        return None

async def fetch_blnn_var(ticker: str, returns: pd.Series, confidence_level: float = 0.95) -> Optional[float]:
    """
    Fetch BLNNVaR (Bayesian LSTM Neural Network VaR) from external API endpoint
    
    Args:
        ticker: Stock ticker symbol
        returns: Series of daily returns
        confidence_level: VaR confidence level (0.95 for 95%, 0.99 for 99%)
    
    Returns:
        VaR as a percentage, or None if endpoint is unavailable
    """
    if not BLNN_VAR_API_URL:
        return None
    
    try:
        # Prepare request data
        returns_list = returns.tolist()
        request_data = {
            "ticker": ticker,
            "returns": returns_list,
            "confidence_level": confidence_level,
            "lookback_days": len(returns)
        }
        
        async with httpx.AsyncClient(timeout=VAR_API_TIMEOUT) as client:
            response = await client.post(
                f"{BLNN_VAR_API_URL}/calculate-var",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract VaR value (adjust based on actual API response structure)
            var_value = result.get("var", result.get("blnnVaR", None))
            if var_value is not None:
                return float(var_value) * 100  # Convert to percentage if needed
            return None
            
    except Exception as e:
        print(f"BLNNVaR API error for {ticker}: {e}")
        return None

async def calculate_risk_metrics(ticker: str, returns: pd.Series) -> Dict[str, float]:
    """
    Calculate comprehensive risk metrics for a stock or portfolio
    
    Args:
        ticker: Stock ticker symbol or portfolio identifier
        returns: Series of daily returns
    
    Returns:
        Dictionary of risk metrics including:
        - Parametric VaR (calculated locally)
        - Monte Carlo VaR (calculated locally)
        - Deep VaR (fetched from external API if available)
        - BLNNVaR (fetched from external API if available)
    """
    if len(returns) < 30:
        return {
            "parametricVaR95": 0.0,
            "monteCarloVaR95": 0.0,
            "deepVaR95": 0.0,
            "blnnVaR95": 0.0,
            "parametricVaR99": 0.0,
            "monteCarloVaR99": 0.0,
            "deepVaR99": 0.0,
            "blnnVaR99": 0.0,
            "sharpeRatio": 0.0,
            "volatility": 0.0,
            "returns": 0.0,
            "maxDrawdown": 0.0
        }
    
    # Calculate basic metrics
    volatility = float(returns.std() * np.sqrt(252) * 100)  # Annualized volatility
    avg_return = float(returns.mean() * 252 * 100)  # Annualized return
    
    # Calculate VaR metrics (Parametric and Monte Carlo are calculated locally)
    parametric_var_95 = calculate_parametric_var(returns, 0.95)
    parametric_var_99 = calculate_parametric_var(returns, 0.99)
    monte_carlo_var_95 = calculate_monte_carlo_var(returns, 0.95)
    monte_carlo_var_99 = calculate_monte_carlo_var(returns, 0.99)
    
    # Fetch Deep VaR and BLNNVaR from external endpoints (run in parallel)
    deep_var_95_task = fetch_deep_var(ticker, returns, 0.95)
    deep_var_99_task = fetch_deep_var(ticker, returns, 0.99)
    blnn_var_95_task = fetch_blnn_var(ticker, returns, 0.95)
    blnn_var_99_task = fetch_blnn_var(ticker, returns, 0.99)
    
    # Wait for all API calls to complete
    deep_var_95, deep_var_99, blnn_var_95, blnn_var_99 = await asyncio.gather(
        deep_var_95_task,
        deep_var_99_task,
        blnn_var_95_task,
        blnn_var_99_task,
        return_exceptions=True
    )
    
    # Handle exceptions and None values (fallback to 0 if unavailable)
    deep_var_95 = 0.0 if (deep_var_95 is None or isinstance(deep_var_95, Exception)) else deep_var_95
    deep_var_99 = 0.0 if (deep_var_99 is None or isinstance(deep_var_99, Exception)) else deep_var_99
    blnn_var_95 = 0.0 if (blnn_var_95 is None or isinstance(blnn_var_95, Exception)) else blnn_var_95
    blnn_var_99 = 0.0 if (blnn_var_99 is None or isinstance(blnn_var_99, Exception)) else blnn_var_99
    
    # Calculate Sharpe ratio
    risk_free_rate = 2.0  # 2% risk-free rate
    sharpe_ratio = (avg_return - risk_free_rate) / volatility if volatility > 0 else 0
    
    # Calculate max drawdown (simplified)
    cumulative_returns = (1 + returns).cumprod()
    running_max = cumulative_returns.expanding().max()
    drawdown = (cumulative_returns - running_max) / running_max
    max_drawdown = float(drawdown.min() * 100)
    
    return {
        "parametricVaR95": parametric_var_95,
        "monteCarloVaR95": monte_carlo_var_95,
        "deepVaR95": deep_var_95,
        "blnnVaR95": blnn_var_95,
        "parametricVaR99": parametric_var_99,
        "monteCarloVaR99": monte_carlo_var_99,
        "deepVaR99": deep_var_99,
        "blnnVaR99": blnn_var_99,
        "sharpeRatio": sharpe_ratio,
        "volatility": volatility,
        "returns": avg_return,
        "maxDrawdown": max_drawdown
    }

def calculate_backtesting_stats(returns: pd.Series, metrics: Dict[str, float], 
                                rolling_window_days: Optional[int] = None) -> Dict[str, Dict[str, float]]:
    """
    Calculate backtesting statistics by comparing historical returns to VaR predictions
    Uses proper out-of-sample backtesting: for each day, calculate VaR using only historical
    data up to (but not including) that day, then check if that day breaches the VaR.
    
    Args:
        returns: Series of daily returns
        metrics: Dictionary of VaR metrics (used as reference for Deep/BLNNVaR only)
        rolling_window_days: Number of days for rolling window (default: VAR_ROLLING_WINDOW_DAYS, typically 252)
    
    Returns:
        Dictionary of breach statistics for each VaR method
    """
    # Use configured rolling window size or default
    if rolling_window_days is None:
        rolling_window_days = VAR_ROLLING_WINDOW_DAYS
    
    # Need at least window_size + some days for testing
    # We need at least the rolling window to calculate VaR, plus at least 1 day to test
    min_required_days = rolling_window_days + 1
    if len(returns) < min_required_days:
        return {}
    
    breach_stats = {}
    
    # Define methods to backtest (only Parametric and Monte Carlo are recalculated)
    var_methods = [
        'parametricVaR95', 'monteCarloVaR95', 'deepVaR95', 'blnnVaR95',
        'parametricVaR99', 'monteCarloVaR99', 'deepVaR99', 'blnnVaR99'
    ]
    
    # Use configurable rolling window for VaR calculation
    # Default is 252 days (1 trading year) but can be configured
    window_size = min(rolling_window_days, len(returns) - 1)
    
    # Minimum window size: need at least 30 days to calculate meaningful VaR
    if window_size < 30:
        return {}
    
    for method in var_methods:
        # Only recalculate Parametric and Monte Carlo VaR
        # Deep VaR and BLNNVaR use the provided metrics (from API)
        if 'parametric' not in method and 'monteCarlo' not in method:
            # For Deep VaR and BLNNVaR, skip if not available
            if method not in metrics or metrics[method] == 0.0:
                continue
            # Use constant VaR for these methods (since we can't recalculate from API)
            var_value = metrics[method]
            var_threshold = -var_value / 100
            
            # Count breaches using constant threshold
            breaches = (returns.iloc[window_size:] < var_threshold).sum()
            total_testable_days = len(returns) - window_size
        else:
            # For Parametric and Monte Carlo: recalculate VaR for each day
            confidence_level = 0.95 if '95' in method else 0.99
            breaches = 0
            total_testable_days = 0
            
            # Calculate VaR for each day using rolling window (out-of-sample)
            for i in range(window_size, len(returns)):
                # Get rolling window of returns up to (but not including) current day
                # This is the key: we use only historical data to predict the current day
                historical_returns = returns.iloc[i - window_size:i]
                
                # Calculate VaR based on historical data only
                if 'parametric' in method:
                    var_value = calculate_parametric_var(historical_returns, confidence_level)
                elif 'monteCarlo' in method:
                    var_value = calculate_monte_carlo_var(historical_returns, confidence_level)
                
                # VaR is already negative (representing loss), so threshold is VaR/100
                var_threshold = var_value / 100
                
                # Check if current day's return breaches the predicted VaR
                # A breach occurs when the actual return is worse (more negative) than VaR
                current_return = returns.iloc[i]
                if current_return < var_threshold:
                    breaches += 1
                
                total_testable_days += 1
        
        if total_testable_days > 0:
            breach_percentage = (breaches / total_testable_days) * 100
            
            # Expected breaches based on confidence level
            if '95' in method:
                expected_breaches = total_testable_days * 0.05
                expected_percentage = 5.0
            else:  # 99% confidence
                expected_breaches = total_testable_days * 0.01
                expected_percentage = 1.0
            
            breach_stats[method] = {
                'breachCount': int(breaches),
                'breachPercentage': round(breach_percentage, 2),
                'expectedBreaches': round(expected_breaches, 1),
                'expectedPercentage': expected_percentage,
                'totalDays': total_testable_days
            }
    
    return breach_stats

def calculate_var_timeseries_for_asset(ticker: str, stock_data: pd.Series, rolling_window: int = 252) -> List[Dict[str, Any]]:
    """
    Calculate VaR time-series for a single asset with a given rolling window
    Also calculates breach flags for each day (out-of-sample backtesting)
    
    Based on reference code approach:
    - For each day i, calculate VaR using historical data up to day i-1
    - Compare actual return on day i to the VaR threshold
    - Mark breach if actual_return < VaR_threshold (both are negative, so breach when return is worse)
    """
    if stock_data.empty:
        return []
    
    # Calculate returns
    returns = stock_data.pct_change().dropna()
    
    if len(returns) < 30:
        return []
    
    timeseries_data = []
    
    # For each day, calculate VaR using available historical data
    # IMPORTANT: Use the rolling_window parameter to determine how many historical days to use
    # For days before rolling_window is available, use all available data (min 30 days)
    for i in range(len(returns)):
        # Determine how much historical data we have
        available_days = i  # Days before current day
        
        # Use rolling_window if we have enough data, otherwise use available_days (but min 30)
        # This ensures we use the specified rolling_window when possible
        if available_days >= rolling_window:
            window_to_use = rolling_window  # Use the full rolling window
        else:
            window_to_use = max(30, available_days)  # Use all available data (min 30)
        
        if window_to_use < 30:
            # Not enough data yet, skip this day
            continue
        
        # Get historical returns up to (but not including) current day
        start_idx = max(0, i - window_to_use)
        historical_returns = returns.iloc[start_idx:i]
        
        if len(historical_returns) < 30:
            continue
        
        # Calculate VaR for this day using historical data up to day i-1
        parametric_var_95 = calculate_parametric_var(historical_returns, 0.95)
        monte_carlo_var_95 = calculate_monte_carlo_var(historical_returns, 0.95)
        parametric_var_99 = calculate_parametric_var(historical_returns, 0.99)
        monte_carlo_var_99 = calculate_monte_carlo_var(historical_returns, 0.99)
        
        # Get current price (day i)
        price_idx = returns.index[i]
        price_value = stock_data.loc[price_idx]
        
        # Get previous day's price (day i-1) to calculate VaR price level
        # VaR is calculated using data up to day i-1, so VaR price should be based on day i-1's price
        if i > 0:
            prev_price_idx = returns.index[i - 1]
            prev_price_value = stock_data.loc[prev_price_idx]
        else:
            # For the first day, use current price
            prev_price_value = price_value
        
        # Format date
        if hasattr(price_idx, 'strftime'):
            date_str = price_idx.strftime('%Y-%m-%d')
        else:
            date_str = str(price_idx)
        
        # Calculate VaR price levels: VaR price = previous_price * (1 + VaR/100)
        # Since VaR is negative, this gives: prev_price * (1 - abs(VaR)/100)
        # This represents the price level below which we expect losses
        parametric_var_95_price = prev_price_value * (1 + parametric_var_95 / 100)
        monte_carlo_var_95_price = prev_price_value * (1 + monte_carlo_var_95 / 100)
        parametric_var_99_price = prev_price_value * (1 + parametric_var_99 / 100)
        monte_carlo_var_99_price = prev_price_value * (1 + monte_carlo_var_99 / 100)
        
        # Calculate actual return for day i (for breach detection)
        # This is the return from day i-1 to day i
        actual_return = returns.iloc[i] if i < len(returns) else 0.0
        
        # Convert VaR percentages to return thresholds (VaR is already negative)
        # A breach occurs when actual_return < var_threshold (both are negative)
        parametric_var_95_threshold = parametric_var_95 / 100  # Convert percentage to decimal
        monte_carlo_var_95_threshold = monte_carlo_var_95 / 100
        parametric_var_99_threshold = parametric_var_99 / 100
        monte_carlo_var_99_threshold = monte_carlo_var_99 / 100
        
        # Check for breaches: actual return is worse (more negative) than VaR threshold
        parametric_breach_95 = 1 if actual_return < parametric_var_95_threshold else 0
        monte_carlo_breach_95 = 1 if actual_return < monte_carlo_var_95_threshold else 0
        parametric_breach_99 = 1 if actual_return < parametric_var_99_threshold else 0
        monte_carlo_breach_99 = 1 if actual_return < monte_carlo_var_99_threshold else 0
        
        timeseries_data.append({
            "date": date_str,
            "price": float(price_value),
            "actualReturn": float(actual_return * 100),  # Store as percentage
            "parametricVaR95": float(parametric_var_95),
            "monteCarloVaR95": float(monte_carlo_var_95),
            "parametricVaR99": float(parametric_var_99),
            "monteCarloVaR99": float(monte_carlo_var_99),
            # Calculate VaR price levels based on previous day's price
            "parametricVaR95Price": float(parametric_var_95_price),
            "monteCarloVaR95Price": float(monte_carlo_var_95_price),
            "parametricVaR99Price": float(parametric_var_99_price),
            "monteCarloVaR99Price": float(monte_carlo_var_99_price),
            # Breach flags (1 = breach occurred, 0 = no breach)
            "parametricBreach95": int(parametric_breach_95),
            "monteCarloBreach95": int(monte_carlo_breach_95),
            "parametricBreach99": int(parametric_breach_99),
            "monteCarloBreach99": int(monte_carlo_breach_99),
        })
    
    return timeseries_data

def save_var_timeseries_to_disk():
    """
    Save pre-calculated VaR time-series cache to CSV files for persistence
    Saves one CSV file per asset per rolling window: data/var_cache/{ticker}_{window}.csv
    """
    global var_timeseries_cache
    
    if not var_timeseries_cache:
        return
    
    data_path = Path(__file__).parent / "data" / "var_cache"
    data_path.mkdir(parents=True, exist_ok=True)
    
    saved_files = 0
    for ticker, windows_data in var_timeseries_cache.items():
        for window, timeseries_data in windows_data.items():
            if not timeseries_data:
                continue
            
            # Create DataFrame from timeseries data
            df = pd.DataFrame(timeseries_data)
            
            # Save to CSV
            csv_file = data_path / f"{ticker}_{window}.csv"
            df.to_csv(csv_file, index=False)
            saved_files += 1
    
    print(f"💾 Saved {saved_files} VaR time-series files to disk")

def load_var_timeseries_from_disk():
    """
    Load pre-calculated VaR time-series from CSV files if they exist
    Returns True if data was loaded, False otherwise
    """
    global var_timeseries_cache
    
    data_path = Path(__file__).parent / "data" / "var_cache"
    if not data_path.exists():
        return False
    
    var_timeseries_cache = {}
    loaded_files = 0
    
    # Find all CSV files matching pattern {ticker}_{window}.csv
    for csv_file in data_path.glob("*.csv"):
        try:
            # Parse filename: {ticker}_{window}.csv
            filename = csv_file.stem  # Remove .csv extension
            parts = filename.rsplit('_', 1)  # Split on last underscore
            if len(parts) != 2:
                continue
            
            ticker = parts[0]
            window = int(parts[1])
            
            # Load CSV
            df = pd.read_csv(csv_file)
            
            # Convert DataFrame back to list of dicts
            timeseries_data = df.to_dict('records')
            
            # Initialize ticker dict if needed
            if ticker not in var_timeseries_cache:
                var_timeseries_cache[ticker] = {}
            
            var_timeseries_cache[ticker][window] = timeseries_data
            loaded_files += 1
        except Exception as e:
            print(f"Error loading {csv_file}: {e}")
            continue
    
    if loaded_files > 0:
        total_data_points = sum(
            len(timeseries) 
            for ticker_data in var_timeseries_cache.values() 
            for timeseries in ticker_data.values()
        )
        print(f"📂 Loaded {loaded_files} VaR time-series files from disk ({total_data_points:,} data points)")
        return True
    
    return False

async def precalculate_var_timeseries_async():
    """
    Pre-calculate VaR time-series for all assets with common rolling windows (async)
    This includes VaR prices and breach flags for each day, following the reference code approach
    Saves the results to disk for persistence
    """
    global var_timeseries_cache, price_data
    
    if price_data is None:
        return
    
    # Try to load from disk first
    if load_var_timeseries_from_disk():
        print("✅ Using pre-calculated VaR data from disk")
        return
    
    print("Pre-calculating VaR time-series (with breaches) for all assets (this may take a few minutes)...")
    rolling_windows = [60, 90, 120, 180, 252, 504]  # Common rolling window sizes
    
    var_timeseries_cache = {}
    ticker_count = 0
    total_assets = len([c for c in price_data.columns if c != 'Date'])
    
    for ticker in price_data.columns:
        if ticker == 'Date':
            continue
        
        stock_data = price_data[ticker].dropna()
        if stock_data.empty:
            continue
        
        var_timeseries_cache[ticker] = {}
        
        # Calculate for each rolling window
        for window in rolling_windows:
            try:
                # This function now calculates VaR prices AND breach flags for each day
                timeseries = calculate_var_timeseries_for_asset(ticker, stock_data, window)
                var_timeseries_cache[ticker][window] = timeseries
            except Exception as e:
                print(f"Error calculating VaR for {ticker} with window {window}: {e}")
                var_timeseries_cache[ticker][window] = []
        
        ticker_count += 1
        if ticker_count % 10 == 0:
            print(f"  Processed {ticker_count}/{total_assets} assets...")
    
    # Calculate summary statistics
    total_calculations = sum(
        len(timeseries) 
        for ticker_data in var_timeseries_cache.values() 
        for timeseries in ticker_data.values()
    )
    print(f"✅ Pre-calculated VaR time-series for {len(var_timeseries_cache)} assets")
    print(f"   Total data points: {total_calculations:,} (VaR prices + breaches)")
    
    # Save to disk for persistence
    save_var_timeseries_to_disk()

def load_data():
    """Load and cache the data files"""
    global price_data, news_data, stock_info
    
    try:
        # Load price data
        data_path = Path(__file__).parent / "data"
        price_file = data_path / "sp100_daily_prices.csv"
        news_file = data_path / "news_sentiment_updated.json"
        
        if not price_file.exists() or not news_file.exists():
            raise FileNotFoundError("Data files not found")
        
        price_data = pd.read_csv(price_file)
        price_data['Date'] = pd.to_datetime(price_data['Date'])
        price_data.set_index('Date', inplace=True)
        
        # Load news data
        with open(news_file, 'r') as f:
            news_data = json.load(f)
        
        # Dynamically generate stock info for all stocks in the CSV
        stock_info.clear()  # Clear the hardcoded entries
        
        # Define sector mappings for common stocks
        sector_mappings = {
            "AAPL": "Technology",
            "MSFT": "Technology", 
            "GOOGL": "Technology",
            "AMZN": "Consumer Discretionary",
            "META": "Communication Services",
            "TSLA": "Consumer Discretionary",
            "NVDA": "Technology",
            "JPM": "Financials",
            "JNJ": "Healthcare",
            "BRK.B": "Financials",
            "ABBV": "Healthcare",
            "ABT": "Healthcare",
            "ACN": "Technology",
            "ADBE": "Technology",
            "AIG": "Financials",
            "ALL": "Financials",
            "AMGN": "Healthcare",
            "AMT": "Real Estate",
            "AVGO": "Technology",
            "AXP": "Financials",
            "BA": "Industrials",
            "BAC": "Financials",
            "BK": "Financials",
            "BKNG": "Consumer Discretionary",
            "BLK": "Financials",
            "BMY": "Healthcare",
            "C": "Financials",
            "CAT": "Industrials",
            "CHTR": "Communication Services",
            "CL": "Consumer Staples",
            "CMCSA": "Communication Services",
            "COF": "Financials",
            "COP": "Energy",
            "COST": "Consumer Staples",
            "CRM": "Technology",
            "CSCO": "Technology",
            "CVS": "Healthcare",
            "CVX": "Energy",
            "DD": "Materials",
            "DHR": "Industrials",
            "DIS": "Communication Services",
            "DOW": "Materials",
            "DUK": "Utilities",
            "EMR": "Industrials",
            "EXC": "Utilities",
            "F": "Consumer Discretionary",
            "FDX": "Industrials",
            "GD": "Industrials",
            "GE": "Industrials",
            "GILD": "Healthcare",
            "GM": "Consumer Discretionary",
            "GS": "Financials",
            "HD": "Consumer Discretionary",
            "HON": "Industrials",
            "IBM": "Technology",
            "INTC": "Technology",
            "KHC": "Consumer Staples",
            "KO": "Consumer Staples",
            "LIN": "Materials",
            "LLY": "Healthcare",
            "LMT": "Industrials",
            "LOW": "Consumer Discretionary",
            "MA": "Financials",
            "MCD": "Consumer Discretionary",
            "MDLZ": "Consumer Staples",
            "MDT": "Healthcare",
            "MET": "Financials",
            "MMM": "Industrials",
            "MO": "Consumer Staples",
            "MRK": "Healthcare",
            "MS": "Financials",
            "NEE": "Utilities",
            "NFLX": "Communication Services",
            "NKE": "Consumer Discretionary",
            "ORCL": "Technology",
            "PEP": "Consumer Staples",
            "PFE": "Healthcare",
            "PG": "Consumer Staples",
            "PM": "Consumer Staples",
            "PYPL": "Technology",
            "QCOM": "Technology",
            "RTX": "Industrials",
            "SBUX": "Consumer Discretionary",
            "SLB": "Energy",
            "SO": "Utilities",
            "SPG": "Real Estate",
            "T": "Communication Services",
            "TGT": "Consumer Discretionary",
            "TMO": "Healthcare",
            "TXN": "Technology",
            "UNH": "Healthcare",
            "UNP": "Industrials",
            "UPS": "Industrials",
            "USB": "Financials",
            "V": "Financials",
            "VZ": "Communication Services",
            "WBA": "Consumer Staples",
            "WFC": "Financials",
            "WMT": "Consumer Staples",
            "XOM": "Energy"
        }
        
        # Generate stock info for all stocks in the CSV
        for ticker in price_data.columns:
            if ticker != 'Date':  # Skip the Date column
                # Get company name (simplified - in real app you'd have a mapping)
                company_name = ticker.replace('.', ' ').title()
                if ticker == 'BRK.B':
                    company_name = "Berkshire Hathaway Inc."
                elif ticker == 'GOOGL':
                    company_name = "Alphabet Inc."
                elif ticker == 'META':
                    company_name = "Meta Platforms Inc."
                elif ticker == 'NVDA':
                    company_name = "NVIDIA Corporation"
                elif ticker == 'JPM':
                    company_name = "JPMorgan Chase & Co."
                elif ticker == 'JNJ':
                    company_name = "Johnson & Johnson"
                elif ticker == 'AAPL':
                    company_name = "Apple Inc."
                elif ticker == 'MSFT':
                    company_name = "Microsoft Corporation"
                elif ticker == 'AMZN':
                    company_name = "Amazon.com Inc."
                elif ticker == 'TSLA':
                    company_name = "Tesla Inc."
                
                # Get sector from mapping or default to "Other"
                sector = sector_mappings.get(ticker, "Other")
                
                stock_info[ticker] = {
                    "name": company_name,
                    "sector": sector
                }
        
        print("Data loaded successfully")
        
    except Exception as e:
        print(f"Error loading data: {e}")
        raise

# Load data on startup
@app.on_event("startup")
async def startup_event():
    load_data()
    # Pre-calculate VaR time-series in background (loads from disk if available, otherwise calculates and saves)
    # Run in background task so health endpoint can respond immediately
    import asyncio
    asyncio.create_task(precalculate_var_timeseries_async())
    # Note: Pre-calculation happens on-demand or can be triggered manually
    # For now, we calculate on-demand which is fast enough for individual requests

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/stocks")
async def get_stocks():
    """Get list of available stocks"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    stocks = []
    for ticker in price_data.columns:
        if ticker in stock_info:
            info = stock_info[ticker]
            # Get latest price
            latest_price = price_data[ticker].dropna().iloc[-1] if not price_data[ticker].dropna().empty else 0
            
            stocks.append({
                "ticker": ticker,
                "name": info["name"],
                "sector": info["sector"],
                "price": float(latest_price),
                "marketCap": 0  # Would need additional data source
            })
    
    return {"stocks": stocks}

@app.get("/api/stocks/{ticker}/price-history")
async def get_stock_price_history(
    ticker: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to retrieve")
):
    """Get price history for a specific stock"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    if ticker not in price_data.columns:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    # Get the last N days of data
    stock_data = price_data[ticker].dropna()
    if stock_data.empty:
        raise HTTPException(status_code=404, detail="No price data available")
    
    # Get the latest available data (use the last available date from price data)
    latest_date = stock_data.index[-1]
    start_date = latest_date - pd.Timedelta(days=days-1)
    
    # Filter to the last N days from the latest available date
    recent_data = stock_data[stock_data.index >= start_date]
    
    # Convert to the format expected by frontend
    price_history = []
    for date, price in recent_data.items():
        # Calculate real sentiment from news data for this date
        sentiment = 0.0
        volume = 0
        
        # Look for news articles for this stock on this date
        date_str = date.strftime("%Y-%m-%d")
        
        # Temporary debug for specific dates
        if ticker == "AAPL" and date_str in ["2025-02-01", "2025-02-02", "2025-02-03"]:
            print(f"DEBUG: Processing {ticker} on {date_str}")
        
        if date_str in news_data:
            stock_news = news_data[date_str]
            
            # Look for this ticker in the news data
            found_stock = False
            for stock_ticker, articles in stock_news.items():
                # Convert ticker format (e.g., "AIG.US" -> "AIG")
                clean_ticker = stock_ticker.split('.')[0]
                
                if clean_ticker == ticker:
                    found_stock = True
                    # Calculate average sentiment from all articles for this stock on this date
                    if articles:
                        sentiments = [article.get("sentiment", 0.0) for article in articles]
                        sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0
                        volume = len(articles)  # Use number of articles as volume
                        
                        # Temporary debug
                        if ticker == "AAPL" and date_str in ["2025-02-01", "2025-02-02", "2025-02-03"]:
                            print(f"  Found {len(articles)} articles, sentiment: {sentiment:.3f}, volume: {volume}")
                    break
            
            # Temporary debug if stock not found
            if not found_stock and ticker == "AAPL" and date_str in ["2025-02-01", "2025-02-02", "2025-02-03"]:
                print(f"  Stock {ticker} not found on {date_str}")
        
        # If no news found for this date, use 0 volume (no random fallback)
        if volume == 0:
            sentiment = 0.0  # Neutral sentiment when no news
            volume = 0  # No volume when no news
            
            # Temporary debug
            if ticker == "AAPL" and date_str in ["2025-02-01", "2025-02-02", "2025-02-03"]:
                print(f"  No news found, using zero: sentiment: {sentiment:.3f}, volume: {volume}")
        
        price_history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": float(price),
            "sentiment": float(sentiment),
            "volume": int(volume)
        })
    
    return {"priceHistory": price_history}

@app.get("/api/stocks/{ticker}/news")
async def get_stock_news(
    ticker: str,
    limit: int = Query(10, ge=1, le=50, description="Number of news items to retrieve")
):
    """Get news headlines for a specific stock"""
    if news_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    news_items = []
    
    # Search for news items containing the ticker
    for date, stocks_news in news_data.items():
        for stock_ticker, articles in stocks_news.items():
            # Convert ticker format (e.g., "AIG.US" -> "AIG")
            clean_ticker = stock_ticker.split('.')[0]
            
            if clean_ticker == ticker:
                for article in articles:
                    try:
                        news_items.append({
                            "title": article["title"],
                            "source": article.get("publisher", "Unknown"),
                            "date": article["date"][:10],  # Extract date part
                            "sentiment": article["sentiment"],
                            "url": article["link"],
                            "content": article.get("content", "")  # Include article content
                        })
                    except KeyError as e:
                        print(f"Missing key in article: {e}")
                        continue
    
    # Sort by date (newest first) and limit results
    news_items.sort(key=lambda x: x["date"], reverse=True)
    return {"news": news_items[:limit]}

@app.get("/api/stocks/{ticker}/metrics")
async def get_stock_metrics(
    ticker: str,
    days: int = Query(None, description="Number of days for backtesting period (uses all data if not specified)"),
    rolling_window: int = Query(None, description="Rolling window size for VaR backtesting (default: VAR_ROLLING_WINDOW_DAYS)")
):
    """Get risk metrics for a specific stock - uses pre-calculated breach data from cache"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    if ticker not in price_data.columns:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    # Get price data for calculations
    stock_data = price_data[ticker].dropna()
    if stock_data.empty:
        raise HTTPException(status_code=404, detail="No price data available")
    
    # Determine rolling window to use
    if rolling_window is None:
        rolling_window = VAR_ROLLING_WINDOW_DAYS
    
    # Round to nearest standard window if not exact match
    standard_windows = [60, 90, 120, 180, 252, 504]
    closest_window = min(standard_windows, key=lambda x: abs(x - rolling_window))
    
    # For metrics calculation, use only the selected period
    if days and days > 0:
        stock_data_for_metrics = stock_data.tail(days)
    else:
        stock_data_for_metrics = stock_data
    
    # Calculate returns for metrics (using selected period only)
    returns_for_metrics = stock_data_for_metrics.pct_change().dropna()
    
    # Calculate comprehensive risk metrics using the selected period
    metrics = await calculate_risk_metrics(ticker, returns_for_metrics)
    
    # Try to get backtesting stats from pre-calculated cache
    backtesting_stats = {}
    
    if ticker in var_timeseries_cache and closest_window in var_timeseries_cache[ticker]:
        # Use pre-calculated breach data from cache
        timeseries_data = var_timeseries_cache[ticker][closest_window]
        
        # Filter to selected period if days is specified
        if days and days > 0:
            timeseries_data = timeseries_data[-days:]
        
        # Calculate breach statistics from pre-calculated data
        var_methods = [
            ('parametricVaR95', 'parametricBreach95'),
            ('monteCarloVaR95', 'monteCarloBreach95'),
            ('parametricVaR99', 'parametricBreach99'),
            ('monteCarloVaR99', 'monteCarloBreach99'),
        ]
        
        total_days = len(timeseries_data)
        
        for var_key, breach_key in var_methods:
            if var_key in metrics:
                # Count breaches from pre-calculated data
                breaches = sum(1 for day in timeseries_data if day.get(breach_key, 0) == 1)
                expected_breaches = total_days * (0.05 if '95' in var_key else 0.01)
                expected_percentage = 5.0 if '95' in var_key else 1.0
                
                backtesting_stats[var_key] = {
                    'actualBreaches': breaches,
                    'expectedBreaches': round(expected_breaches, 1),
                    'expectedPercentage': expected_percentage,
                    'totalDays': total_days
                }
        
        print(f"✅ Used pre-calculated breach data for {ticker} (rolling_window={closest_window}, days={days or 'all'})")
    else:
        # Fallback: calculate backtesting stats on-demand (slower)
        print(f"⚠️  Cache miss for {ticker} (rolling_window={closest_window}), calculating backtesting on-demand...")
        
        # For backtesting, we need enough historical data
        if days and days > 0:
            stock_data_for_backtesting = stock_data.tail(days + closest_window)
        else:
            stock_data_for_backtesting = stock_data
        
        returns_for_backtesting = stock_data_for_backtesting.pct_change().dropna()
        backtesting_stats = calculate_backtesting_stats(returns_for_backtesting, metrics, rolling_window_days=closest_window)
        
        # If days parameter was provided, recalculate for just the selected period
        if days and days > 0 and len(returns_for_backtesting) >= closest_window + days:
            period_returns = returns_for_backtesting.tail(days + closest_window)
            backtesting_stats = calculate_backtesting_stats(period_returns, metrics, rolling_window_days=closest_window)
    
    return {
        "metrics": metrics,
        "backtesting": backtesting_stats,
        "rolling_window": closest_window
    }

@app.get("/api/stocks/{ticker}/var-timeseries")
async def get_var_timeseries(
    ticker: str,
    days: int = Query(None, description="Number of days for time series (uses all data if not specified)"),
    rolling_window: int = Query(None, description="Rolling window size for VaR calculation (default: VAR_ROLLING_WINDOW_DAYS)")
):
    """Get time-series VaR data for plotting - returns pre-calculated data from cache"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    if ticker not in price_data.columns:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    # Use configured rolling window size or default
    if rolling_window is None:
        rolling_window = VAR_ROLLING_WINDOW_DAYS
    
    # Round to nearest standard window if not exact match
    standard_windows = [60, 90, 120, 180, 252, 504]
    closest_window = min(standard_windows, key=lambda x: abs(x - rolling_window))
    
    # Try to get from pre-calculated cache first
    timeseries_data = None
    if ticker in var_timeseries_cache and closest_window in var_timeseries_cache[ticker]:
        timeseries_data = var_timeseries_cache[ticker][closest_window].copy()
        print(f"✅ Retrieved pre-calculated VaR data for {ticker} (rolling_window={closest_window}) from cache")
    
    # If not in cache, calculate on-demand (fallback)
    if timeseries_data is None or len(timeseries_data) == 0:
        print(f"⚠️  Cache miss for {ticker} (rolling_window={closest_window}), calculating on-demand...")
        stock_data = price_data[ticker].dropna()
        if stock_data.empty:
            raise HTTPException(status_code=404, detail="No price data available")
        
        # If days parameter is provided, limit the data we process
        if days and days > 0:
            # Only need to process the last N days + rolling window for calculation
            stock_data = stock_data.tail(days + closest_window)
        
        timeseries_data = calculate_var_timeseries_for_asset(ticker, stock_data, closest_window)
        
        if not timeseries_data:
            raise HTTPException(status_code=400, detail="Not enough data for VaR calculation")
    
    # If days parameter is provided, return only the last N days
    if days and days > 0:
        timeseries_data = timeseries_data[-days:]
    
    # Add Deep VaR and BLNNVaR (set to 0 for now, can be fetched from APIs if needed)
    for day_data in timeseries_data:
        # Deep VaR and BLNNVaR are typically from external APIs, set to 0 for now
        # They can be calculated separately if needed
        day_data["deepVaR95"] = 0.0
        day_data["blnnVaR95"] = 0.0
        day_data["deepVaR99"] = 0.0
        day_data["blnnVaR99"] = 0.0
        day_data["deepVaR95Price"] = day_data["price"]
        day_data["blnnVaR95Price"] = day_data["price"]
        day_data["deepVaR99Price"] = day_data["price"]
        day_data["blnnVaR99Price"] = day_data["price"]
        # Breach flags for Deep VaR and BLNNVaR (set to 0 since they're not calculated)
        day_data["deepBreach95"] = 0
        day_data["blnnBreach95"] = 0
        day_data["deepBreach99"] = 0
        day_data["blnnBreach99"] = 0
    
    return {
        "timeseries": timeseries_data,
        "rolling_window": closest_window
    }

@app.post("/api/portfolio/metrics")
async def get_portfolio_metrics(request: PortfolioRequest):
    """Calculate portfolio metrics"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    # Extract from request body
    selected_assets = request.selected_assets
    weights = request.weights
    
    # Validate inputs
    if not selected_assets:
        raise HTTPException(status_code=400, detail="No assets selected")
    
    if len(selected_assets) != len(weights):
        raise HTTPException(status_code=400, detail="Weights must match selected assets")
    
    # Calculate portfolio returns
    portfolio_returns = pd.Series(dtype=float)
    
    for ticker, weight in weights.items():
        if ticker in price_data.columns:
            stock_data = price_data[ticker].dropna()
            if not stock_data.empty:
                stock_returns = stock_data.pct_change().dropna()
                if portfolio_returns.empty:
                    portfolio_returns = stock_returns * weight
                else:
                    # Align dates and add weighted returns
                    aligned_returns = stock_returns.reindex(portfolio_returns.index, method='ffill')
                    portfolio_returns += aligned_returns * weight
    
    if portfolio_returns.empty:
        raise HTTPException(status_code=400, detail="No valid portfolio data")
    
    # Create portfolio identifier for API calls
    portfolio_ticker = f"PORTFOLIO_{'_'.join(sorted(selected_assets))}"
    
    # Calculate portfolio risk metrics using the same function
    portfolio_metrics = await calculate_risk_metrics(portfolio_ticker, portfolio_returns)
    
    # Calculate backtesting statistics for portfolio
    portfolio_backtesting = calculate_backtesting_stats(portfolio_returns, portfolio_metrics)
    
    return {
        "metrics": portfolio_metrics,
        "backtesting": portfolio_backtesting
    }

@app.post("/api/portfolio/price-history")
async def get_portfolio_price_history(request: PortfolioPriceHistoryRequest):
    """Get portfolio price history"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    # Extract from request body
    selected_assets = request.selected_assets
    weights = request.weights
    days = request.days
    
    # Validate days parameter
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
    
    if not selected_assets:
        raise HTTPException(status_code=400, detail="No assets selected")
    
    # Get the last N days of data
    end_date = price_data.index[-1]
    start_date = end_date - timedelta(days=days)
    
    # Filter data to the requested period
    period_data = price_data.loc[start_date:end_date]
    
    # Calculate weighted portfolio prices
    portfolio_history = []
    
    for date in period_data.index:
        portfolio_price = 0.0
        portfolio_sentiment = 0.0
        portfolio_volume = 0.0
        
        # Calculate weighted sentiment from news data for this date
        date_str = date.strftime("%Y-%m-%d")
        total_weight = 0.0
        
        for ticker, weight in weights.items():
            if ticker in period_data.columns:
                price = period_data.loc[date, ticker]
                if not pd.isna(price):
                    portfolio_price += price * weight
                    total_weight += weight
                    
                    # Get real sentiment from news data for this stock on this date
                    stock_sentiment = 0.0
                    stock_volume = 0
                    
                    if date_str in news_data:
                        stock_news = news_data[date_str]
                        # Look for this ticker in the news data
                        for stock_ticker, articles in stock_news.items():
                            # Convert ticker format (e.g., "AIG.US" -> "AIG")
                            clean_ticker = stock_ticker.split('.')[0]
                            
                            if clean_ticker == ticker:
                                # Calculate average sentiment from all articles for this stock on this date
                                if articles:
                                    sentiments = [article.get("sentiment", 0.0) for article in articles]
                                    stock_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0
                                    stock_volume = len(articles)  # Use number of articles as volume
                                break
                    
                    # If no news found for this date, use a small random variation around 0
                    if stock_volume == 0:
                        stock_sentiment = np.random.uniform(-0.1, 0.1)  # Small random sentiment
                        stock_volume = np.random.randint(1000, 5000)  # Low volume
                    
                    # Add weighted sentiment and volume to portfolio
                    portfolio_sentiment += stock_sentiment * weight
                    portfolio_volume += stock_volume * weight
        
        if portfolio_price > 0:
            # Normalize sentiment by total weight if we have weights
            if total_weight > 0:
                portfolio_sentiment = portfolio_sentiment / total_weight
                portfolio_volume = portfolio_volume / total_weight
            
            portfolio_history.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": float(portfolio_price),
                "sentiment": float(portfolio_sentiment),
                "volume": int(portfolio_volume)
            })
    
    return {"priceHistory": portfolio_history}

@app.post("/api/portfolio/var-timeseries")
async def get_portfolio_var_timeseries(request: PortfolioVaRTimeSeriesRequest):
    """Get time-series VaR data for portfolio - similar to asset endpoint"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    # Extract from request body
    selected_assets = request.selected_assets
    weights = request.weights
    days = request.days
    rolling_window = request.rolling_window
    
    # Validate inputs
    if not selected_assets:
        raise HTTPException(status_code=400, detail="No assets selected")
    
    if len(selected_assets) != len(weights):
        raise HTTPException(status_code=400, detail="Weights must match selected assets")
    
    # Use configured rolling window size or default
    if rolling_window is None:
        rolling_window = VAR_ROLLING_WINDOW_DAYS
    
    # Round to nearest standard window if not exact match
    standard_windows = [60, 90, 120, 180, 252, 504]
    closest_window = min(standard_windows, key=lambda x: abs(x - rolling_window))
    
    # Calculate portfolio returns (weighted sum of individual asset returns)
    portfolio_returns = pd.Series(dtype=float)
    portfolio_prices = pd.Series(dtype=float)
    
    for ticker, weight in weights.items():
        if ticker in price_data.columns:
            stock_data = price_data[ticker].dropna()
            if not stock_data.empty:
                stock_returns = stock_data.pct_change().dropna()
                stock_prices = stock_data[stock_returns.index]  # Align prices with returns
                
                if portfolio_returns.empty:
                    portfolio_returns = stock_returns * weight
                    portfolio_prices = stock_prices * weight
                else:
                    # Align dates and add weighted returns/prices
                    aligned_returns = stock_returns.reindex(portfolio_returns.index, method='ffill')
                    aligned_prices = stock_prices.reindex(portfolio_prices.index, method='ffill')
                    portfolio_returns += aligned_returns * weight
                    portfolio_prices += aligned_prices * weight
    
    if portfolio_returns.empty or len(portfolio_returns) < 30:
        raise HTTPException(status_code=400, detail="Not enough data for VaR calculation")
    
    # If days parameter is provided, limit the data we process
    if days and days > 0:
        portfolio_returns = portfolio_returns.tail(days + closest_window)
        portfolio_prices = portfolio_prices.tail(days + closest_window)
    
    # Calculate VaR time-series for portfolio (similar to calculate_var_timeseries_for_asset)
    timeseries_data = []
    
    for i in range(len(portfolio_returns)):
        available_days = i  # Days before current day
        
        # Determine the window to use
        if available_days >= closest_window:
            window_to_use = closest_window
        else:
            window_to_use = max(30, available_days)
        
        if window_to_use < 30:
            continue
        
        start_idx = max(0, i - window_to_use)
        historical_returns = portfolio_returns.iloc[start_idx:i]
        
        if len(historical_returns) < 30:
            continue
        
        # Calculate VaR for this day
        parametric_var_95 = calculate_parametric_var(historical_returns, 0.95)
        monte_carlo_var_95 = calculate_monte_carlo_var(historical_returns, 0.95)
        parametric_var_99 = calculate_parametric_var(historical_returns, 0.99)
        monte_carlo_var_99 = calculate_monte_carlo_var(historical_returns, 0.99)
        
        price_idx = portfolio_returns.index[i]
        price_value = portfolio_prices.loc[price_idx]
        
        if i > 0:
            prev_price_idx = portfolio_returns.index[i - 1]
            prev_price_value = portfolio_prices.loc[prev_price_idx]
        else:
            prev_price_value = price_value
        
        if hasattr(price_idx, 'strftime'):
            date_str = price_idx.strftime('%Y-%m-%d')
        else:
            date_str = str(price_idx)
        
        # Calculate VaR price levels (using previous day's price)
        parametric_var_95_price = prev_price_value * (1 + parametric_var_95 / 100)
        monte_carlo_var_95_price = prev_price_value * (1 + monte_carlo_var_95 / 100)
        parametric_var_99_price = prev_price_value * (1 + parametric_var_99 / 100)
        monte_carlo_var_99_price = prev_price_value * (1 + monte_carlo_var_99 / 100)
        
        actual_return = portfolio_returns.iloc[i] if i < len(portfolio_returns) else 0.0
        
        # Check for breaches
        parametric_var_95_threshold = parametric_var_95 / 100
        monte_carlo_var_95_threshold = monte_carlo_var_95 / 100
        parametric_var_99_threshold = parametric_var_99 / 100
        monte_carlo_var_99_threshold = monte_carlo_var_99 / 100
        
        parametric_breach_95 = 1 if actual_return < parametric_var_95_threshold else 0
        monte_carlo_breach_95 = 1 if actual_return < monte_carlo_var_95_threshold else 0
        parametric_breach_99 = 1 if actual_return < parametric_var_99_threshold else 0
        monte_carlo_breach_99 = 1 if actual_return < monte_carlo_var_99_threshold else 0
        
        # For Deep VaR and BLNNVaR, we need to calculate them for the portfolio
        # For now, set to 0 (can be fetched from APIs if needed)
        portfolio_ticker = f"PORTFOLIO_{'_'.join(sorted(selected_assets))}"
        deep_var_95 = 0.0
        deep_var_99 = 0.0
        blnn_var_95 = 0.0
        blnn_var_99 = 0.0
        
        # Try to fetch Deep VaR and BLNNVaR from APIs (if configured)
        if len(historical_returns) >= 30:
            deep_var_95_task = fetch_deep_var(portfolio_ticker, historical_returns, 0.95)
            deep_var_99_task = fetch_deep_var(portfolio_ticker, historical_returns, 0.99)
            blnn_var_95_task = fetch_blnn_var(portfolio_ticker, historical_returns, 0.95)
            blnn_var_99_task = fetch_blnn_var(portfolio_ticker, historical_returns, 0.99)
            
            deep_var_95, deep_var_99, blnn_var_95, blnn_var_99 = await asyncio.gather(
                deep_var_95_task, deep_var_99_task, blnn_var_95_task, blnn_var_99_task,
                return_exceptions=True
            )
            
            # Handle exceptions and None values
            deep_var_95 = deep_var_95 if (not isinstance(deep_var_95, Exception) and deep_var_95 is not None) else 0.0
            deep_var_99 = deep_var_99 if (not isinstance(deep_var_99, Exception) and deep_var_99 is not None) else 0.0
            blnn_var_95 = blnn_var_95 if (not isinstance(blnn_var_95, Exception) and blnn_var_95 is not None) else 0.0
            blnn_var_99 = blnn_var_99 if (not isinstance(blnn_var_99, Exception) and blnn_var_99 is not None) else 0.0
        
        deep_var_95_price = prev_price_value * (1 + deep_var_95 / 100) if (deep_var_95 is not None and deep_var_95 != 0) else price_value
        deep_var_99_price = prev_price_value * (1 + deep_var_99 / 100) if (deep_var_99 is not None and deep_var_99 != 0) else price_value
        blnn_var_95_price = prev_price_value * (1 + blnn_var_95 / 100) if (blnn_var_95 is not None and blnn_var_95 != 0) else price_value
        blnn_var_99_price = prev_price_value * (1 + blnn_var_99 / 100) if (blnn_var_99 is not None and blnn_var_99 != 0) else price_value
        
        deep_breach_95 = 1 if (deep_var_95 is not None and deep_var_95 != 0 and actual_return < (deep_var_95 / 100)) else 0
        deep_breach_99 = 1 if (deep_var_99 is not None and deep_var_99 != 0 and actual_return < (deep_var_99 / 100)) else 0
        blnn_breach_95 = 1 if (blnn_var_95 is not None and blnn_var_95 != 0 and actual_return < (blnn_var_95 / 100)) else 0
        blnn_breach_99 = 1 if (blnn_var_99 is not None and blnn_var_99 != 0 and actual_return < (blnn_var_99 / 100)) else 0
        
        timeseries_data.append({
            "date": date_str,
            "price": float(price_value),
            "actualReturn": float(actual_return * 100),
            "parametricVaR95": float(parametric_var_95),
            "monteCarloVaR95": float(monte_carlo_var_95),
            "parametricVaR99": float(parametric_var_99),
            "monteCarloVaR99": float(monte_carlo_var_99),
            "deepVaR95": float(deep_var_95),
            "blnnVaR95": float(blnn_var_95),
            "deepVaR99": float(deep_var_99),
            "blnnVaR99": float(blnn_var_99),
            "parametricVaR95Price": float(parametric_var_95_price),
            "monteCarloVaR95Price": float(monte_carlo_var_95_price),
            "parametricVaR99Price": float(parametric_var_99_price),
            "monteCarloVaR99Price": float(monte_carlo_var_99_price),
            "deepVaR95Price": float(deep_var_95_price),
            "blnnVaR95Price": float(blnn_var_95_price),
            "deepVaR99Price": float(deep_var_99_price),
            "blnnVaR99Price": float(blnn_var_99_price),
            "parametricBreach95": int(parametric_breach_95),
            "monteCarloBreach95": int(monte_carlo_breach_95),
            "parametricBreach99": int(parametric_breach_99),
            "monteCarloBreach99": int(monte_carlo_breach_99),
            "deepBreach95": int(deep_breach_95),
            "blnnBreach95": int(blnn_breach_95),
            "deepBreach99": int(deep_breach_99),
            "blnnBreach99": int(blnn_breach_99),
        })
    
    # If days parameter is provided, return only the last N days
    if days and days > 0:
        timeseries_data = timeseries_data[-days:]
    
    return {
        "timeseries": timeseries_data,
        "rolling_window": closest_window
    }

@app.get("/api/market/summary")
async def get_market_summary():
    """Get market summary statistics"""
    if price_data is None:
        raise HTTPException(status_code=500, detail="Data not loaded")
    
    # Calculate market summary
    latest_prices = price_data.iloc[-1].dropna()
    
    summary = {
        "totalStocks": len(latest_prices),
        "marketDate": price_data.index[-1].strftime("%Y-%m-%d"),
        "averagePrice": float(latest_prices.mean()),
        "totalVolume": 0,  # Would need volume data
        "marketSentiment": 0.0  # Would need sentiment aggregation
    }
    
    return summary

@app.get("/api/news/{article_id}/lime-analysis")
async def get_lime_analysis(article_id: str):
    """
    Get LIME analysis for a specific news article
    
    This endpoint would integrate with a FinBERT service to provide:
    - Word-level sentiment analysis
    - LIME explanations for each word's contribution
    - Overall sentiment score
    """
    # TODO: Integrate with actual FinBERT service
    # For now, return mock data to demonstrate the interface
    
    # Mock article data - in real implementation, this would come from the news service
    mock_articles = {
        "article_1": {
            "title": "Apple Reports Strong Q4 Earnings, Exceeds Expectations",
            "content": "Apple Inc. reported strong fourth-quarter earnings that exceeded analyst expectations. The company's revenue grew by 8% year-over-year, driven by strong iPhone sales and services growth. CEO Tim Cook highlighted the company's continued innovation and market leadership.",
            "sentiment": 0.25
        },
        "article_2": {
            "title": "Market Concerns Over Tech Sector Volatility",
            "content": "Investors are expressing concerns about increased volatility in the technology sector. Recent market fluctuations have raised questions about the sustainability of current valuations. Analysts suggest a more cautious approach to tech investments.",
            "sentiment": -0.15
        },
        "article_3": {
            "title": "Tesla Announces New Electric Vehicle Models",
            "content": "Tesla has announced the launch of several new electric vehicle models, including an affordable sedan and an updated SUV. The company expects these new models to significantly boost sales and market share in the competitive EV market.",
            "sentiment": 0.18
        }
    }
    
    # Get article data (mock for now)
    article = mock_articles.get(article_id, {
        "title": "Sample Financial News Article",
        "content": "This is a sample financial news article that would be analyzed by the FinBERT model. The LIME analysis would show how each word contributes to the overall sentiment score.",
        "sentiment": 0.05
    })
    
    # Mock LIME analysis - in real implementation, this would come from FinBERT service
    def generate_mock_lime_words(content: str, sentiment: float) -> List[Dict[str, Any]]:
        """Generate mock LIME word analysis based on content and sentiment"""
        words = content.lower().split()
        lime_words = []
        
        # Define some financial keywords and their typical sentiment values
        positive_words = ['strong', 'growth', 'positive', 'increase', 'profit', 'success', 'gain', 'up', 'higher']
        negative_words = ['decline', 'loss', 'negative', 'decrease', 'concern', 'risk', 'down', 'lower', 'weak']
        neutral_words = ['company', 'market', 'report', 'announce', 'quarter', 'year', 'financial', 'business']
        
        for word in words:
            clean_word = word.strip('.,!?;:')
            if len(clean_word) < 3:
                continue
                
            lime_value = 0.0
            importance = 0.3  # Base importance
            
            if clean_word in positive_words:
                lime_value = 0.1 + (sentiment * 0.1)  # Positive contribution
                importance = 0.7
            elif clean_word in negative_words:
                lime_value = -0.1 - (sentiment * 0.1)  # Negative contribution
                importance = 0.7
            elif clean_word in neutral_words:
                lime_value = 0.02  # Slight positive for neutral words
                importance = 0.4
            else:
                # Random small contribution for other words
                lime_value = (sentiment * 0.05) + (np.random.uniform(-0.02, 0.02))
                importance = 0.2 + (np.random.uniform(0, 0.3))
            
            lime_words.append({
                "word": clean_word,
                "limeValue": round(lime_value, 3),
                "importance": round(importance, 2)
            })
        
        return lime_words
    
    lime_words = generate_mock_lime_words(article["content"], article["sentiment"])
    
    # Generate AI insights using ChatGPT
    ai_insights = generate_xai_insights(
        article["title"], 
        article["content"], 
        article["sentiment"], 
        lime_words
    )
    
    return {
        "title": article["title"],
        "content": article["content"],
        "limeWords": lime_words,
        "overallSentiment": article["sentiment"],
        "aiInsights": ai_insights
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 