# BigQuery Release Pulse 🚀

BigQuery Release Pulse is a premium, high-fidelity developer dashboard built with **Python Flask** and **Vanilla Web Technologies (HTML5/CSS3/ES6 JS)**. The application pulls and parses the official Google Cloud BigQuery Release Notes feed, categorizes updates (Features, Announcements, Issues, Breaking Changes, etc.) into isolated entries, and allows users to search, copy, or share specific updates directly to Twitter/X with character-limit optimization.

---

## ✨ Features

- **Atomic Update Grouping**: Parses HTML CDATA inside the RSS feed stream, dividing combined daily logs into independent, category-tagged updates.
- **Smart Caching**: Employs a file-based cache (`releases_cache.json`) expiring every 1 hour to prevent unnecessary HTTP requests and rate limits.
- **Instant Search & Type Filtering**: Real-time frontend indexing searches across dates, types, and text bodies dynamically.
- **X / Twitter Web Integration**: Pre-populates a custom sharing composer card, visualizes character limit warnings (280 characters), and provides a one-click auto-shortener that fits descriptions to X guidelines.
- **High-End Developer UI**: Built using premium dark-slate themes, blurred glassmorphic header panels, gradient status metrics, and hover micro-animations.

---

## 📁 File Structure

- [`app.py`](./app.py) - Flask routing backend, XML Atom parser, and JSON API.
- [`requirements.txt`](./requirements.txt) - Backend libraries (Flask, requests, beautifulsoup4).
- [`templates/index.html`](./templates/index.html) - Structural framework layout and inline SVGs.
- [`static/css/styles.css`](./static/css/styles.css) - Styling, custom glow animations, metrics grids, and glassmorphic overlays.
- [`static/js/main.js`](./static/js/main.js) - UI triggers, dynamic DOM card generation, copying success animations, and composer math.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher installed on your system.

### 1. Install Dependencies
Navigate to the project root and run `pip` to install the requirements:
```bash
pip install -r requirements.txt
```

### 2. Launch Server
Start the Flask development environment:
```bash
python app.py
```

### 3. Open Dashboard
Launch your web browser and open:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🛠️ Technology Stack
- **Backend**: Python Flask, XML ElementTree, BeautifulSoup 4, Requests.
- **Frontend**: ES6 Javascript (Fetch API, Clipboard API, Web Intents).
- **Styling**: Plain Vanilla CSS3 (Custom Variables, Keyframes, Backdrop-Filters).
