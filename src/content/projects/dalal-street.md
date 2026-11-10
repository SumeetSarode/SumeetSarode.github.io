---
title: Dalal Street
tagline: "Resilience by design: building on data sources you don't control."
summary: A free research terminal for the Indian stock market, built from scratch. Every data source has a fallback chain, so one blocked provider never takes the app down.
metaDescription: 'Case study: a free NSE research terminal with provider fallback chains, a shared service layer for CLI and web, and a transparent rating score.'
order: 2
repoUrl: https://github.com/SumeetSarode/dalal-street
status: Version 1 feature-complete. Runs locally as a CLI and a web app.
tags:
  - Python 3.13
  - FastAPI
  - Jinja2
  - Pydantic v2
  - SQLite
  - typer
  - pytest
checkedOn: 2026-11-10
disclaimer: Educational project. Not financial advice.
facts:
  - value: '2,300+'
    label: NSE stocks searchable
  - value: '268'
    label: hermetic unit tests, no network needed
  - value: '5'
    label: ready-made screener presets
diagram:
  caption: 'Two interfaces share one service layer. Each service reads from sources that can fail.'
  layers:
    - name: Two interfaces
      items:
        - 'Command line (typer)'
        - 'Web app (FastAPI, Jinja, vanilla JavaScript)'
    - name: Shared services
      items:
        - 'Market and analysis'
        - 'Fundamentals and screener'
        - 'Comparison and funds'
        - 'News and rating'
    - name: Providers, each behind a fallback chain
      items:
        - 'Prices: NSE, then bhavcopy, then yfinance'
        - 'Fundamentals: screener.in, then yfinance'
        - 'Mutual funds: AMFI'
        - 'News: GDELT, then Google News RSS'
    - name: Local storage
      items:
        - 'SQLite snapshot of the whole market'
        - 'Refreshed in the background by a scheduler'
---

## The problem

I wanted a research terminal for Indian stocks that doesn't need a broker account, a subscription, or a paywall. OpenBB is the obvious inspiration, but its data stack doesn't cover Indian markets, so I built one from scratch.

Indian market data is a patchwork. NSE blocks foreign IP addresses. Free sources rate-limit you, go down, or change shape without warning. A terminal that depends on any single source will break on the day you need it.

## What it does

- **Search, quotes, and charts** for 2,300+ NSE stocks, with an interactive candlestick chart.
- **Technicals:** RSI, MACD, 50- and 200-day moving averages, Bollinger Bands, ATR, and 52-week levels.
- **Fundamentals,** including promoter pledging and the shareholding pattern.
- **A screener** with five ready-made presets over a prebuilt snapshot of the whole market.
- **Comparison** of any set of stocks, with the best in each metric highlighted.
- **Macro views:** NSE indices and daily FII/DII cash flows.
- **Mutual funds** from AMFI: scheme search, NAV history, and returns.
- **News and sentiment,** with model-scored sentiment when you add a key.
- **The Dalal Score,** a transparent rating that combines technical, fundamental, and sentiment sub-scores.

## Decision 1: every source gets a fallback chain

Each data source sits behind a chain that tries the next option when one fails. Prices try NSE, then NSE's bhavcopy files, then yfinance. News tries GDELT, then Google News RSS. Sentiment tries Gemini, then Groq, then OpenRouter, and quietly shows headlines only if no key is set.

The chains are **region-aware.** One setting, `DATA_REGION`, decides whether NSE goes first (running from India) or yfinance goes first (everywhere else). The same code runs in both places. When something is missing, the app degrades and tells you what's missing instead of crashing.

## Decision 2: one service layer, two interfaces

Providers sit behind small abstract interfaces, so adding or swapping a data source never touches a service or a page. Each domain (market, fundamentals, screener, news, rating) is one service, and the command line and the web app both call the same functions. Neither interface has logic of its own, which means neither can drift out of sync with the other.

Math stays pure wherever possible. Technicals, screener filters, and the rating engine are plain functions, so the 268 unit tests run with fixtures and fakes. No live network is involved.

## Decision 3: a rating you can inspect

The Dalal Score is built from sub-scores with visible weights, not a black box. Stocks get a combined score, and indices get a trend-only variant. The design notes in the repo cover the sub-scores, the buckets, and the veto rules. Every rating carries the line "educational, not investment advice" in the app and in the command line.

## Built for people who won't touch a terminal

I wanted someone non-technical to be able to use it. After a one-time setup, using the app means double-clicking a desktop icon. It pulls the latest reviewed release, refreshes dependencies, and opens the app in the browser. A background scheduler keeps the market snapshot fresh without ever blocking startup.

## What it is not

It is not financial advice, and data can be stale, delayed, or wrong. It runs on your own machine and isn't hosted anywhere, and I'm not claiming a user count or any measure of how accurate the rating is.
