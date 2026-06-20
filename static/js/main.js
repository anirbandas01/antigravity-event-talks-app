// Application State
let releases = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedRelease = null;

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const filterButtons = document.querySelectorAll('.btn-filter');
const metricCards = document.querySelectorAll('.metric-card');
const releasesTimeline = document.getElementById('releases-timeline');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const lastUpdatedTime = document.getElementById('last-updated-time');
const btnExport = document.getElementById('btn-export');
const checkboxTheme = document.getElementById('checkbox-theme');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelTweet = document.getElementById('btn-cancel-tweet');
const btnPostTweet = document.getElementById('btn-post-tweet');
const btnOptimizeTweet = document.getElementById('btn-optimize-tweet');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load theme preference before fetching
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (checkboxTheme) checkboxTheme.checked = true;
    }
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    btnRefresh.addEventListener('click', () => fetchReleases(true));

    // Theme Toggle switch
    if (checkboxTheme) {
        checkboxTheme.addEventListener('change', () => {
            if (checkboxTheme.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                showToast('Theme switched to Light mode');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
                showToast('Theme switched to Dark mode');
            }
        });
    }

    // Export to CSV button
    if (btnExport) {
        btnExport.addEventListener('click', exportToCSV);
    }

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        btnClearSearch.style.display = searchQuery ? 'block' : 'none';
        filterAndRenderReleases();
    });

    // Clear search button
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        filterAndRenderReleases();
        searchInput.focus();
    });

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.type;
            
            // Sync with metrics card active state
            updateMetricCardActiveState(activeFilter);
            filterAndRenderReleases();
        });
    });

    // Metric cards acting as filters
    metricCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.filter;
            activeFilter = filterType === 'all' ? 'all' : filterType;
            
            // Sync with toolbar buttons active state
            filterButtons.forEach(b => {
                if (b.dataset.type === activeFilter) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            
            updateMetricCardActiveState(filterType);
            filterAndRenderReleases();
        });
    });

    // Tweet Modal controls
    btnCloseModal.addEventListener('click', closeTweetModal);
    btnCancelTweet.addEventListener('click', closeTweetModal);
    btnPostTweet.addEventListener('click', postTweet);
    btnOptimizeTweet.addEventListener('click', optimizeTweetText);
    
    tweetTextarea.addEventListener('input', () => {
        updateCharCount(tweetTextarea.value.length);
    });

    // Close modal on click outside
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });
}

// Sync metric card active highlight
function updateMetricCardActiveState(filterType) {
    metricCards.forEach(c => {
        if (c.dataset.filter === filterType) {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });
}

// Fetch Releases from Backend API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        releases = data.releases;
        
        // Update stats dashboard
        updateStatsDashboard(data.stats);
        
        // Update timestamp
        const date = new Date(data.timestamp * 1000);
        lastUpdatedTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Filter and render list
        filterAndRenderReleases();
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast('Error syncing release notes. Displaying offline data.');
    } finally {
        showLoading(false);
    }
}

// Show/Hide Loading Spinner
function showLoading(isLoading) {
    if (isLoading) {
        btnRefresh.classList.add('loading');
        releasesTimeline.style.opacity = '0.4';
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';
    } else {
        btnRefresh.classList.remove('loading');
        releasesTimeline.style.opacity = '1';
        loadingState.style.display = 'none';
    }
}

// Update Dashboard Statistics Card Numbers
function updateStatsDashboard(stats) {
    document.querySelector('#stat-total .metric-value').textContent = stats.total;
    document.querySelector('#stat-features .metric-value').textContent = stats.Feature;
    document.querySelector('#stat-announcements .metric-value').textContent = stats.Announcement;
    document.querySelector('#stat-issues .metric-value').textContent = stats.Issue;
    document.querySelector('#stat-breaking .metric-value').textContent = stats.Breaking;
}

// Filter and Render Releases List
function filterAndRenderReleases() {
    // Filter release elements
    const filtered = releases.filter(item => {
        const matchesFilter = activeFilter === 'all' || item.type.toLowerCase() === activeFilter.toLowerCase();
        
        const itemText = item.text ? item.text.toLowerCase() : '';
        const itemType = item.type ? item.type.toLowerCase() : '';
        const itemDate = item.date ? item.date.toLowerCase() : '';
        const query = searchQuery.toLowerCase();
        
        const matchesSearch = !query || 
            itemText.includes(query) || 
            itemType.includes(query) || 
            itemDate.includes(query);
            
        return matchesFilter && matchesSearch;
    });

    // Check if empty
    if (filtered.length === 0) {
        releasesTimeline.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';

    // Group filtered elements by date
    const grouped = {};
    filtered.forEach(item => {
        if (!grouped[item.date]) {
            grouped[item.date] = [];
        }
        grouped[item.date].push(item);
    });

    // Render timeline
    releasesTimeline.innerHTML = '';
    
    Object.keys(grouped).forEach(date => {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'timeline-group';
        
        // Date divider
        const dateDivider = document.createElement('div');
        dateDivider.className = 'timeline-date-divider';
        dateDivider.textContent = date;
        groupContainer.appendChild(dateDivider);
        
        // Items under this date
        grouped[date].forEach(item => {
            const card = createReleaseCard(item);
            groupContainer.appendChild(card);
        });
        
        releasesTimeline.appendChild(groupContainer);
    });
}

// Create a single release note card DOM element
function createReleaseCard(item) {
    const card = document.createElement('article');
    card.className = 'release-card';
    card.setAttribute('aria-label', `Release note for ${item.date} of type ${item.type}`);

    // Create unique IDs for action elements
    const uniqueId = `release-${item.type}-${item.date.replace(/[^a-zA-Z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Header
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const badge = document.createElement('span');
    badge.className = `type-badge badge-${item.type.toLowerCase()}`;
    badge.textContent = item.type;
    header.appendChild(badge);
    
    // Action buttons inside card header
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    // Copy Text Button
    const btnCopy = document.createElement('button');
    btnCopy.className = 'btn-icon-action btn-copy-card';
    btnCopy.id = `btn-copy-${uniqueId}`;
    btnCopy.title = 'Copy text representation';
    btnCopy.innerHTML = `
        <svg class="icon icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
    `;
    btnCopy.addEventListener('click', () => copyToClipboard(item, btnCopy));
    actions.appendChild(btnCopy);
    
    // Tweet Button
    const btnTweet = document.createElement('button');
    btnTweet.className = 'btn-icon-action btn-tweet-card';
    btnTweet.id = `btn-tweet-${uniqueId}`;
    btnTweet.title = 'Compose tweet';
    btnTweet.innerHTML = `
        <svg class="icon icon-share" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
    `;
    btnTweet.addEventListener('click', () => openTweetModal(item));
    actions.appendChild(btnTweet);
    
    header.appendChild(actions);
    card.appendChild(header);
    
    // Body
    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML = item.html;
    card.appendChild(body);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    
    const link = document.createElement('a');
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'original-link';
    link.innerHTML = `
        <span>Official Release Notes</span>
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
    `;
    footer.appendChild(link);
    card.appendChild(footer);
    
    return card;
}

// Copy plain text content to clipboard
function copyToClipboard(item, btnElement) {
    const text = `BigQuery [${item.type}] - ${item.date}\n${item.text}\n\nRead more: ${item.link}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Release note copied to clipboard!');
        
        // Success animation icon swap
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `;
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Clipboard copy failed. Please copy manually.');
    });
}

// Open Tweet Composer Dialog
function openTweetModal(item) {
    selectedRelease = item;
    
    // Build default tweet structure
    let typeEmoji = "🚀";
    if (item.type.toLowerCase() === 'issue') typeEmoji = "⚠️";
    if (item.type.toLowerCase() === 'breaking') typeEmoji = "🚨";
    if (item.type.toLowerCase() === 'announcement') typeEmoji = "📢";
    
    const intro = `BigQuery Update ${typeEmoji} [${item.type}]: `;
    const link = `\n\nDetails: ${item.link}`;
    
    // Extract description and limit it initially
    let desc = item.text;
    const maxDescLength = 280 - (intro.length + link.length);
    
    if (desc.length > maxDescLength) {
        desc = desc.substring(0, maxDescLength - 3) + "...";
    }
    
    const fullTweetText = `${intro}${desc}${link}`;
    
    tweetTextarea.value = fullTweetText;
    updateCharCount(fullTweetText.length);
    
    // Open modal
    tweetModal.classList.add('active');
    tweetModal.setAttribute('aria-hidden', 'false');
    tweetTextarea.focus();
}

// Close Tweet Composer Dialog
function closeTweetModal() {
    tweetModal.classList.remove('active');
    tweetModal.setAttribute('aria-hidden', 'true');
    selectedRelease = null;
}

// Character Counter
function updateCharCount(length) {
    charCount.textContent = length;
    
    if (length > 280) {
        charCount.className = 'character-counter danger';
        btnPostTweet.disabled = true;
    } else if (length > 250) {
        charCount.className = 'character-counter warning';
        btnPostTweet.disabled = false;
    } else {
        charCount.className = 'character-counter';
        btnPostTweet.disabled = false;
    }
}

// Shorten/Format Tweet Automatically
function optimizeTweetText() {
    if (!selectedRelease) return;
    
    let typeEmoji = "🚀";
    if (selectedRelease.type.toLowerCase() === 'issue') typeEmoji = "⚠️";
    if (selectedRelease.type.toLowerCase() === 'breaking') typeEmoji = "🚨";
    if (selectedRelease.type.toLowerCase() === 'announcement') typeEmoji = "📢";
    
    const intro = `BigQuery ${selectedRelease.type} ${typeEmoji}: `;
    const link = `\n\nDetails: ${selectedRelease.link}`;
    
    const maxAllowedDescLength = 280 - (intro.length + link.length + 4); // 4 for safety + ellipses
    
    let desc = selectedRelease.text;
    if (desc.length > maxAllowedDescLength) {
        // Find a space to split nicely, if possible
        let sliced = desc.substring(0, maxAllowedDescLength);
        const lastSpace = sliced.lastIndexOf(' ');
        if (lastSpace > maxAllowedDescLength * 0.75) {
            sliced = sliced.substring(0, lastSpace);
        }
        desc = sliced.trim() + "...";
    }
    
    const optimizedText = `${intro}${desc}${link}`;
    tweetTextarea.value = optimizedText;
    updateCharCount(optimizedText.length);
    showToast('Tweet shortened to fit character limit!');
}

// Open Web Intent to Post on Twitter/X
function postTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) {
        showToast('Tweet is too long! Please shorten it below 280 characters.');
        return;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
}

// Show Toast Alerts
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3500);
}

// Get the currently filtered release notes
function getFilteredReleases() {
    return releases.filter(item => {
        const matchesFilter = activeFilter === 'all' || item.type.toLowerCase() === activeFilter.toLowerCase();
        
        const itemText = item.text ? item.text.toLowerCase() : '';
        const itemType = item.type ? item.type.toLowerCase() : '';
        const itemDate = item.date ? item.date.toLowerCase() : '';
        const query = searchQuery.toLowerCase();
        
        const matchesSearch = !query || 
            itemText.includes(query) || 
            itemType.includes(query) || 
            itemDate.includes(query);
            
        return matchesFilter && matchesSearch;
    });
}

// Export the filtered release notes to a CSV file
function exportToCSV() {
    const filtered = getFilteredReleases();
    if (filtered.length === 0) {
        showToast('No releases found to export!');
        return;
    }

    // Header row
    let csv = "Date,Type,Description,Link\n";
    
    // Data rows
    filtered.forEach(item => {
        // Escape quotes by doubling them up
        const date = `"${item.date.replace(/"/g, '""')}"`;
        const type = `"${item.type.replace(/"/g, '""')}"`;
        const text = `"${item.text.replace(/"/g, '""')}"`;
        const link = `"${item.link.replace(/"/g, '""')}"`;
        
        csv += `${date},${type},${text},${link}\n`;
    });
    
    // Create Blob and trigger download
    try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const filterStr = activeFilter === 'all' ? 'all' : activeFilter.toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_releases_${filterStr}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Exported ${filtered.length} release notes to CSV!`);
    } catch (e) {
        console.error('CSV Export failed:', e);
        showToast('CSV export failed. Please try again.');
    }
}
