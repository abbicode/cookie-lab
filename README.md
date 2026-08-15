# Cookie Lab

This project analyzes cookie recipe features and texture labels.

## Project structure

- `data/raw/` - original raw datasets
- `data/interim/` - intermediate cleaned data
- `data/processed/` - final modeling datasets
- `src/data_processing/` - data loading and preprocessing utilities
- `src/models/` - model training and evaluation code
- `src/analysis/` - analysis and summary helpers
- `notebooks/` - exploratory and presentation notebooks

## Quick start

```bash
cd /Users/abbygoblick/cookie-lab
python -m src.models.train_models
```

The training script expects a processed dataset at `data/processed/cookie_model.pkl` or a pickle file in the project root.
