import type { LegalSection } from "@/components/layout/LegalLayout";

export const licensesIntro =
  "AlphaVision Insights is open-source software. Third-party data, models, and libraries are subject to their own terms.";

export const licensesSections: LegalSection[] = [
  {
    title: "Project license (MIT)",
    paragraphs: [
      "Copyright (c) 2026 AlphaVision Insights contributors",
      "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:",
      "The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.",
      "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.",
      "See the LICENSE file in the repository root for the full text.",
    ],
  },
  {
    title: "Models and libraries",
    list: [
      "FinBERT (ProsusAI/finbert) — Hugging Face model license; check model card.",
      "GluonTS / PyTorch — DeepAR training and inference.",
      "Finnhub API — market data and news; requires API key; subject to Finnhub terms.",
      "Yahoo Finance (yfinance) — price data; subject to Yahoo terms of use.",
      "OpenAI API (optional) — chat feature; subject to OpenAI usage policies.",
    ],
  },
  {
    title: "Data",
    paragraphs: [
      "Redistribution of raw Finnhub or Yahoo data may be restricted. This project is intended for research and self-hosted use. Review provider agreements before commercial redistribution.",
    ],
  },
];
