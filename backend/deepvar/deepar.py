import pandas as pd
import numpy as np
import torch
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server environments
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import os
from tqdm import tqdm
from datetime import datetime, timedelta

# GluonTS imports
from gluonts.dataset.pandas import PandasDataset
from gluonts.torch.model.deepar import DeepAREstimator
from gluonts.torch.distributions import StudentTOutput
from gluonts.evaluation import make_evaluation_predictions

# PyTorch Lightning
import pytorch_lightning as pl

# Set seeds for reproducibility
np.random.seed(42)
torch.manual_seed(42)
torch.set_float32_matmul_precision('medium')

# Check if CUDA is available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

class StockReturnPredictor:
    def __init__(
        self,
        data_path=None,
        prediction_length=1,
        context_length=63,  # ~ 3 months of trading days
        num_samples=1000,
        lr=1e-3,
        batch_size=32,
        num_epochs=100,
        early_stopping_patience=10,
        hidden_size=40,
        num_layers=2,
        dropout_rate=0.1,
        freq="1D",  # Daily frequency
        results_dir="results",
    ):
        """
        Initialize the DeepAR model for stock return prediction.
        From: https://github.com/giorgosfatouros/DeepVaR (extra branch)
        """
        self.data_path = data_path
        self.prediction_length = prediction_length
        self.context_length = context_length
        self.num_samples = num_samples
        self.lr = lr
        self.batch_size = batch_size
        self.num_epochs = num_epochs
        self.early_stopping_patience = early_stopping_patience
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.dropout_rate = dropout_rate
        self.freq = freq
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True, parents=True)
        
        self.models = {}
        self.forecasts = {}
        self.metrics = {}
        
    def load_data(self, df=None):
        """Load data and convert prices to return ratios (P_t / P_{t-1})."""
        if df is None:
            if self.data_path is None:
                raise ValueError("Either df or data_path must be provided")
            df = pd.read_csv(self.data_path, index_col=0)
            df.index = pd.to_datetime(df.index)
        
        df = df.dropna(axis=1, how='any')
        print(f"Kept {len(df.columns)} stocks after dropping those with missing values")
        
        self.price_data = df.copy()
        self.returns_data = (df / df.shift(1)).dropna()
        self.returns_data = self.returns_data.sort_index()
        
        min_date = self.returns_data.index.min()
        max_date = self.returns_data.index.max()
        complete_range = pd.date_range(start=min_date, end=max_date, freq=self.freq)
        self.returns_data = self.returns_data.reindex(complete_range)
        self.returns_data = self.returns_data.ffill()
        self.returns_data = self.returns_data.dropna()
        
        print(f"Loaded data with {len(self.returns_data)} rows and {len(self.returns_data.columns)} columns")
        print(f"Date range: {self.returns_data.index[0]} to {self.returns_data.index[-1]}")
        
        return self.returns_data
    
    def _convert_to_long_format(self, df):
        """Convert wide format DataFrame to long format for GluonTS."""
        df_with_index = df.reset_index()
        date_col = df_with_index.columns[0]
        stock_columns = list(df.columns)
        long_data = pd.melt(
            df_with_index,
            id_vars=[date_col],
            value_vars=stock_columns,
            var_name='item_id',
            value_name='target'
        )
        long_data = long_data.rename(columns={date_col: 'timestamp'})
        long_data = long_data.sort_values(['item_id', 'timestamp'])
        return long_data
    
    def prepare_dataset(self, train_ratio=0.7, val_ratio=0.15):
        """Prepare GluonTS datasets for training, validation, and testing."""
        train_size = int(len(self.returns_data) * train_ratio)
        val_size = int(len(self.returns_data) * val_ratio)
        
        train_end_date = self.returns_data.index[train_size]
        val_end_date = self.returns_data.index[train_size + val_size]
        
        train_data = self.returns_data.loc[:train_end_date].copy()
        val_data = self.returns_data.loc[
            self.returns_data.index[max(0, train_size - self.context_length)]:val_end_date
        ].copy()
        test_data = self.returns_data.loc[
            self.returns_data.index[max(0, train_size + val_size - self.context_length)]:
        ].copy()
        
        print(f"Training data: {len(train_data)} rows")
        print(f"Validation data: {len(val_data)} rows")
        print(f"Testing data: {len(test_data)} rows")
        
        train_long = self._convert_to_long_format(train_data)
        val_long = self._convert_to_long_format(val_data)
        test_long = self._convert_to_long_format(test_data)
        
        self.train_dataset = PandasDataset.from_long_dataframe(
            train_long,
            item_id="item_id",
            timestamp="timestamp",
            target="target",
            freq=self.freq
        )
        
        self.val_dataset = PandasDataset.from_long_dataframe(
            val_long,
            item_id="item_id",
            timestamp="timestamp",
            target="target",
            freq=self.freq
        )
        
        self.test_dataset = PandasDataset.from_long_dataframe(
            test_long,
            item_id="item_id",
            timestamp="timestamp",
            target="target",
            freq=self.freq
        )
        
        self.train_end_idx = train_size
        self.val_end_idx = train_size + val_size
        
        return self.train_dataset, self.val_dataset, self.test_dataset
    
    def train_model(self):
        """Train a DeepAR model for all stocks together with validation."""
        print("Training model...")
        
        class ValidationCallback(pl.callbacks.Callback):
            def __init__(self):
                self.val_losses = []
                
            def on_validation_epoch_end(self, trainer, pl_module):
                val_loss = trainer.callback_metrics.get('val_loss', torch.tensor(float('nan')))
                self.val_losses.append(val_loss.item() if not torch.isnan(val_loss) else float('nan'))
        
        val_callback = ValidationCallback()
        
        pl_trainer_kwargs = {
            "max_epochs": self.num_epochs,
            "accelerator": "auto",
            "enable_progress_bar": True,
            "callbacks": [
                pl.callbacks.EarlyStopping(
                    monitor="val_loss",
                    patience=self.early_stopping_patience,
                    mode="min"
                ),
                val_callback
            ],
            "deterministic": True,
        }
        
        estimator = DeepAREstimator(
            prediction_length=self.prediction_length,
            context_length=self.context_length,
            freq=self.freq,
            batch_size=self.batch_size,
            lr=self.lr,
            hidden_size=self.hidden_size,
            num_layers=self.num_layers,
            dropout_rate=self.dropout_rate,
            distr_output=StudentTOutput(),
            trainer_kwargs=pl_trainer_kwargs,
        )
        
        self.model = estimator.train(
            training_data=self.train_dataset,
            validation_data=self.val_dataset,
            num_workers=0
        )
        
        self.val_losses = val_callback.val_losses
        self._plot_loss_curves()
        
        return self.model
    
    def _plot_loss_curves(self):
        """Plot training and validation loss curves."""
        if hasattr(self, 'val_losses') and len(self.val_losses) > 0:
            plt.figure(figsize=(10, 6))
            plt.plot(range(1, len(self.val_losses) + 1), self.val_losses, 'b-', label='Validation Loss')
            plt.xlabel('Epoch')
            plt.ylabel('Loss')
            plt.title('Model Training and Validation Loss')
            plt.legend()
            plt.grid(True)
            loss_plot_path = self.results_dir / 'loss_curves.png'
            plt.savefig(loss_plot_path)
            plt.close()
            print(f"Loss curves saved to {loss_plot_path}")
    
    def train_all_models(self):
        """Train a single model for all stocks."""
        if not hasattr(self, 'train_dataset') or not hasattr(self, 'val_dataset'):
            raise ValueError("Datasets not prepared. Call prepare_dataset() first.")
        self.model = self.train_model()
        print("Model training complete")
    
    def predict_all(self, dataset=None):
        """Generate predictions for all tickers using the trained model."""
        if not hasattr(self, 'model'):
            raise ValueError("Model not trained. Call train_all_models() first.")
        if dataset is None:
            dataset = self.test_dataset
        
        print("Generating predictions...")
        forecast_it, ts_it = make_evaluation_predictions(
            dataset=dataset,
            predictor=self.model,
            num_samples=self.num_samples
        )
        
        forecasts = list(forecast_it)
        tss = list(ts_it)
        print(f"Generated {len(forecasts)} forecasts")
        
        try:
            unique_item_ids = sorted(set(item['item_id'] for item in dataset))
            for i, item_id in enumerate(unique_item_ids):
                if i < len(forecasts):
                    self.forecasts[item_id] = {'predictions': forecasts[i], 'actuals': tss[i]}
        except (TypeError, AttributeError):
            tickers = self.returns_data.columns.tolist()
            for i, ticker in enumerate(tickers):
                if i < len(forecasts):
                    self.forecasts[ticker] = {'predictions': forecasts[i], 'actuals': tss[i]}
        
        print(f"Mapped predictions for {len(self.forecasts)} tickers")
        return self.forecasts
    
    def evaluate_model(self, dataset=None, start_idx=None):
        """Evaluate the model on the specified dataset."""
        if dataset is None:
            dataset = self.test_dataset
            start_idx = self.val_end_idx
        elif start_idx is None:
            start_idx = self.val_end_idx if dataset is self.test_dataset else self.train_end_idx
        
        if not hasattr(self, 'forecasts') or len(self.forecasts) == 0:
            self.predict_all(dataset)
        
        all_mse, all_mae, all_mape = [], [], []
        for ticker, forecast_data in tqdm(self.forecasts.items(), desc="Evaluating"):
            forecast = forecast_data['predictions']
            if ticker in self.returns_data.columns:
                actual_returns = self.returns_data[ticker].iloc[start_idx:start_idx + len(forecast.samples[0])]
                pred_median = forecast.quantile(0.5)
                comparison_length = min(len(actual_returns), len(pred_median))
                if comparison_length > 0:
                    actual = actual_returns.values[:comparison_length]
                    pred = pred_median[:comparison_length]
                    self.metrics[ticker] = {
                        'MSE': np.mean((actual - pred) ** 2),
                        'MAE': np.mean(np.abs(actual - pred)),
                        'MAPE': np.nan
                    }
                    all_mse.append(self.metrics[ticker]['MSE'])
                    all_mae.append(self.metrics[ticker]['MAE'])
        
        avg_metrics = {
            'Average MSE': np.mean(all_mse) if all_mse else np.nan,
            'Average MAE': np.mean(all_mae) if all_mae else np.nan,
            'Average MAPE': np.nan
        }
        return self.metrics, avg_metrics
    
    def evaluate_all(self):
        return self.evaluate_model(self.test_dataset, self.val_end_idx)
    
    def run_backtest(self, start_date=None, end_date=None, num_stocks=100, dataset=None):
        """Run a backtest of the model."""
        if not hasattr(self, 'forecasts') or len(self.forecasts) == 0:
            self.predict_all(dataset or self.test_dataset)
        
        start_idx = self.val_end_idx
        test_dates = self.returns_data.index[start_idx:]
        
        if num_stocks < len(self.forecasts):
            backtest_tickers = list(self.forecasts.keys())[:num_stocks]
        else:
            backtest_tickers = list(self.forecasts.keys())
        
        results = []
        for i in tqdm(range(len(test_dates) - 1), desc="Running backtest"):
            date = test_dates[i]
            next_date = test_dates[i + 1]
            actual_returns = self.returns_data.loc[next_date]
            
            for ticker in backtest_tickers:
                if ticker not in self.returns_data.columns:
                    continue
                forecast = self.forecasts[ticker]['predictions']
                sample_idx = min(i, forecast.samples.shape[1] - 1)
                samples = forecast.samples[:, sample_idx]
                
                mean_return = samples.mean()
                median_return = np.median(samples)
                var_5 = np.quantile(samples, 0.05)
                var_1 = np.quantile(samples, 0.01)
                
                try:
                    actual_return = actual_returns[ticker]
                except KeyError:
                    continue
                
                results.append({
                    'date': date,
                    'next_date': next_date,
                    'ticker': ticker,
                    'actual_return': actual_return,
                    'predicted_mean': mean_return,
                    'predicted_median': median_return,
                    'var_5': var_5,
                    'var_1': var_1,
                    'hit_5': actual_return <= var_5,
                    'hit_1': actual_return <= var_1
                })
        
        backtest_df = pd.DataFrame(results)
        if len(backtest_df) > 0:
            backtest_df.to_csv(self.results_dir / "test_backtest_results.csv", index=False)
            return backtest_df, None
        return backtest_df, None
