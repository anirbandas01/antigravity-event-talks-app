import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup
import json
import time

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "releases_cache.json"
CACHE_EXPIRY_SECONDS = 3600  # 1 hour

def parse_content_html(html_str, date_str, link_str):
    """
    Parses the CDATA HTML content from each feed entry.
    Extracts sub-updates grouped under <h3> tags (e.g. Feature, Issue, Announcement).
    """
    if not html_str:
        return []
        
    soup = BeautifulSoup(html_str, 'html.parser')
    items = []
    
    current_type = "Update"
    current_elements = []
    
    for child in soup.children:
        # NavigableString may not have name, so we check for Tag elements with name == 'h3'
        if child.name == 'h3':
            if current_elements:
                item_soup = BeautifulSoup('', 'html.parser')
                for el in current_elements:
                    item_soup.append(el)
                
                # Make relative links absolute
                for a in item_soup.find_all('a'):
                    href = a.get('href', '')
                    if href.startswith('/'):
                        a['href'] = 'https://cloud.google.com' + href
                    elif href.startswith('docs.cloud.google.com'):
                        a['href'] = 'https://' + href
                
                items.append({
                    'date': date_str,
                    'type': current_type,
                    'html': str(item_soup).strip(),
                    'text': item_soup.get_text().strip(),
                    'link': link_str
                })
            current_type = child.get_text().strip()
            current_elements = []
        else:
            current_elements.append(child)
            
    # Append the final parsed item
    if current_elements or current_type != "Update":
        item_soup = BeautifulSoup('', 'html.parser')
        for el in current_elements:
            item_soup.append(el)
        
        for a in item_soup.find_all('a'):
            href = a.get('href', '')
            if href.startswith('/'):
                a['href'] = 'https://cloud.google.com' + href
            elif href.startswith('docs.cloud.google.com'):
                a['href'] = 'https://' + href
                
        items.append({
            'date': date_str,
            'type': current_type,
            'html': str(item_soup).strip(),
            'text': item_soup.get_text().strip(),
            'link': link_str
        })
        
    return items

def fetch_and_parse_feed():
    """
    Fetches the XML feed from Google Cloud and parses it.
    Returns a list of release note dictionary items.
    """
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_content = response.content
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return None

    try:
        root = ET.fromstring(xml_content)
        # Atom feed namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        parsed_items = []
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text.strip()
            
            link_elem = entry.find('atom:link[@rel="alternate"]', ns)
            link_str = link_elem.attrib['href'] if link_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Parse sub-elements from the HTML content
            sub_items = parse_content_html(content_html, date_str, link_str)
            parsed_items.extend(sub_items)
            
        return parsed_items
    except Exception as e:
        print(f"Error parsing feed XML: {e}")
        return None

def get_releases(force_refresh=False):
    """
    Gets release notes either from cache or by fetching live feed.
    """
    # Check if cache exists and is fresh
    if not force_refresh and os.path.exists(CACHE_FILE):
        file_mod_time = os.path.getmtime(CACHE_FILE)
        if time.time() - file_mod_time < CACHE_EXPIRY_SECONDS:
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    print("Returning release notes from cache")
                    return cache_data
            except Exception as e:
                print(f"Error reading cache: {e}")

    # Fetch live data
    print("Fetching live release notes from Google Cloud")
    live_items = fetch_and_parse_feed()
    
    if live_items is not None:
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(live_items, f, ensure_ascii=False, indent=2)
            print("Successfully cached fresh release notes")
        except Exception as e:
            print(f"Error writing to cache: {e}")
        return live_items
    
    # Fallback to expired cache if live fetch fails
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                print("Live fetch failed, falling back to expired cache")
                return json.load(f)
        except Exception as e:
            print(f"Error reading expired cache fallback: {e}")
            
    return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    releases = get_releases(force_refresh=force_refresh)
    
    # Calculate stats for the response
    stats = {
        'total': len(releases),
        'Feature': sum(1 for r in releases if r['type'].lower() == 'feature'),
        'Announcement': sum(1 for r in releases if r['type'].lower() == 'announcement'),
        'Issue': sum(1 for r in releases if r['type'].lower() == 'issue'),
        'Breaking': sum(1 for r in releases if r['type'].lower() == 'breaking'),
        'Change': sum(1 for r in releases if r['type'].lower() == 'change'),
        'Update': sum(1 for r in releases if r['type'].lower() == 'update')
    }
    
    return jsonify({
        'releases': releases,
        'stats': stats,
        'timestamp': time.time()
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
