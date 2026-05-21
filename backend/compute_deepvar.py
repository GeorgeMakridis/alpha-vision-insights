"""
AlphaVision DeepVaR Computation Script
=====================================
Trains the DeepVaR (DeepAR) probabilistic model on S&P 100 price data
and produces per-ticker, per-date VaR estimates.

Results are saved to backend/data/deepvar_results/ and loaded by the
dashboard on startup.

Usage:
    cd backend
    python compute_deepvar.py                    # Full training + backtest
    python compute_deepvar.py --epochs 50        # Quick training (fewer epochs)
    python compute_deepvar.py --skip-training    # Re-run backtest using existing model

Reference: https://github.com/giorgosfatouros/DeepVaR (extra branch)
"""

# PyTorch 2.6+ defaults to weights_only=True; GluonTS/Lightning checkpoints need weights_only=False
import torch
_orig_load = torch.load
def _patched_load(*args, **kwargs):
    kwargs["weights_only"] = False  # GluonTS/Lightning checkpoints need full unpickling
    return _orig_load(*args, **kwargs)
torch.load = _patched_load

import os
import sys
import argparse
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

# Add backend to path for imports
BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

from deepvar.deepar import StockReturnPredictor
from deepvar import static_parms as sp


def main():
    parser = argparse.ArgumentParser(description="Compute DeepVaR for AlphaVision dashboard")
    parser.add_argument("--epochs", type=int, default=sp.EPOCHS, help=f"Training epochs (default: {sp.EPOCHS})")
    parser.add_argument("--context-length", type=int, default=sp.CONTEXT_LENGTH, help=f"Context length (default: {sp.CONTEXT_LENGTH})")
    parser.add_argument("--skip-training", action="store_true", help="Skip training, only re-run backtest")
    parser.add_argument("--incremental", action="store_true",
                        help="Load model, predict only new dates, append to CSV (no retraining)")
    parser.add_argument("--data-path", type=str, default=sp.path, help="Path to price CSV")
    args = parser.parse_args()

    data_path = BACKEND_DIR / args.data_path
    results_dir = BACKEND_DIR / sp.RESULTS_DIR

    if not data_path.exists():
        print(f"❌ Price data not found at {data_path}")
        print(f"   Run setup.sh first or ensure data files are in {BACKEND_DIR / 'data'}/")
        sys.exit(1)

    results_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("AlphaVision DeepVaR Computation")
    print("=" * 70)
    print(f"  Data path    : {data_path}")
    print(f"  Results dir  : {results_dir}")
    print(f"  Epochs       : {args.epochs}")
    print(f"  Context len  : {args.context_length}")
    print(f"  Prediction   : {sp.PREDICTION_LENGTH} day ahead")
    print(f"  Architecture : {sp.NUM_LAYERS}-layer LSTM, {sp.N_CELLS} cells, dropout={sp.DROPOUT}")
    print("=" * 70)

    predictor = StockReturnPredictor(
        data_path=str(data_path),
        prediction_length=sp.PREDICTION_LENGTH,
        context_length=args.context_length,
        num_samples=1000,
        lr=sp.LRATE,
        batch_size=32,
        num_epochs=args.epochs,
        early_stopping_patience=5,
        hidden_size=sp.N_CELLS,
        num_layers=sp.NUM_LAYERS,
        dropout_rate=sp.DROPOUT,
        freq=sp.FREQ,
        results_dir=str(results_dir),
    )

    print("\n📊 Loading and preprocessing data...")
    predictor.load_data()

    dashboard_file = results_dir / "deepvar_dashboard.csv"
    model_path = results_dir / "deepar_model"

    # ─── Incremental mode: load model, predict new dates only, append to CSV ───
    if args.incremental:
        if not dashboard_file.exists():
            print("⚠️  No existing dashboard. Running full training instead.")
            args.incremental = False
        elif not model_path.exists():
            print("⚠️  No saved model found. Running full training instead.")
            args.incremental = False
        else:
            # Find latest next_date in existing dashboard
            existing_df = pd.read_csv(dashboard_file)
            existing_df['next_date'] = pd.to_datetime(existing_df['next_date'])
            latest_next = pd.Timestamp(existing_df['next_date'].max())
            latest_next_str = latest_next.strftime('%Y-%m-%d') if hasattr(latest_next, 'strftime') else str(latest_next)[:10]

            # Find first new date in price data (after latest_next)
            price_dates = pd.to_datetime(predictor.returns_data.index)
            new_dates = price_dates[price_dates > latest_next]
            if len(new_dates) == 0:
                print("✅ No new dates to process. DeepVaR is up to date.")
                sys.exit(0)

            first_new_date = new_dates.min()
            print(f"📅 Incremental update: {latest_next_str} -> {first_new_date.strftime('%Y-%m-%d')} ({len(new_dates)} new days)")

            predictor.load_model(model_path)
            # Per-day one-step predictions (batch predict_all reuses one forecast per ticker)
            backtest_df = predictor.run_incremental_backtest(first_new_date)

            if backtest_df is not None and len(backtest_df) > 0:
                new_results = backtest_df.copy()
                new_results['deepVaR95'] = (new_results['var_5'] - 1) * 100
                new_results['deepVaR99'] = (new_results['var_1'] - 1) * 100
                new_results['actual_return_pct'] = (new_results['actual_return'] - 1) * 100
                new_results['deepBreach95'] = (new_results['actual_return_pct'] < new_results['deepVaR95']).astype(int)
                new_results['deepBreach99'] = (new_results['actual_return_pct'] < new_results['deepVaR99']).astype(int)

                cols_to_save = ['date', 'next_date', 'ticker', 'deepVaR95', 'deepVaR99', 'actual_return_pct',
                               'deepBreach95', 'deepBreach99', 'predicted_mean', 'predicted_median', 'var_5', 'var_1']
                new_df = new_results[cols_to_save].copy()
                new_df['next_date'] = new_df['next_date'].astype(str).str[:10]
                existing_df['next_date'] = existing_df['next_date'].astype(str).str[:10]
                combined = pd.concat([existing_df, new_df], ignore_index=True)
                combined = combined.drop_duplicates(subset=['ticker', 'next_date'], keep='last')
                combined.to_csv(dashboard_file, index=False)
                print(f"✅ Appended {len(new_results)} rows. Total: {len(combined)}")
            sys.exit(0)

    total_days = len(predictor.returns_data)
    train_ratio = 1 - (sp.NUMBER_OF_TEST + sp.NUMBER_OF_VAL) / total_days
    val_ratio = sp.NUMBER_OF_VAL / total_days

    print(f"   Total days: {total_days}")
    print(f"   Train ratio: {train_ratio:.2%}, Val ratio: {val_ratio:.2%}")

    predictor.prepare_dataset(train_ratio=train_ratio, val_ratio=val_ratio)

    if not args.skip_training:
        print("\n🧠 Training DeepAR model (this may take a while)...")
        predictor.train_all_models()
        predictor.save_model()
    else:
        print("\n⏭️  Skipping training (--skip-training flag)")

    print("\n🔮 Generating predictions on test set...")
    predictor.predict_all()

    print("\n📈 Evaluating model...")
    test_metrics, test_avg = predictor.evaluate_all()
    print(f"   Test MSE: {test_avg['Average MSE']:.6f}")
    print(f"   Test MAE: {test_avg['Average MAE']:.6f}")

    print("\n🔄 Running backtest...")
    backtest_df, portfolio_results = predictor.run_backtest()

    if backtest_df is not None and len(backtest_df) > 0:
        dashboard_results = backtest_df.copy()
        dashboard_results['deepVaR95'] = (dashboard_results['var_5'] - 1) * 100
        dashboard_results['deepVaR99'] = (dashboard_results['var_1'] - 1) * 100
        dashboard_results['actual_return_pct'] = (dashboard_results['actual_return'] - 1) * 100

        dashboard_results['deepBreach95'] = (
            dashboard_results['actual_return_pct'] < dashboard_results['deepVaR95']
        ).astype(int)
        dashboard_results['deepBreach99'] = (
            dashboard_results['actual_return_pct'] < dashboard_results['deepVaR99']
        ).astype(int)

        cols_to_save = [
            'date', 'next_date', 'ticker',
            'deepVaR95', 'deepVaR99',
            'actual_return_pct',
            'deepBreach95', 'deepBreach99',
            'predicted_mean', 'predicted_median',
            'var_5', 'var_1'
        ]
        dashboard_results[cols_to_save].to_csv(dashboard_file, index=False)

        print(f"\n✅ Dashboard-ready results saved to: {dashboard_file}")
        print(f"   Rows: {len(dashboard_results)}")
        print(f"   Tickers: {dashboard_results['ticker'].nunique()}")
        print(f"   Date range: {dashboard_results['date'].min()} to {dashboard_results['date'].max()}")

        print(f"\n📊 DeepVaR Performance Summary:")
        print(f"   VaR 95% hit ratio: {backtest_df['hit_5'].mean():.4f} (target: 0.05)")
        print(f"   VaR 99% hit ratio: {backtest_df['hit_1'].mean():.4f} (target: 0.01)")
    else:
        print("⚠️  No backtest results produced")

    print("\n✅ DeepVaR computation complete!")
    print(f"   Results saved to: {results_dir}/")
    print(f"   To use in dashboard: restart the backend (it loads results on startup)")


if __name__ == "__main__":
    main()
